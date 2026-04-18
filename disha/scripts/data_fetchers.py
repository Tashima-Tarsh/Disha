
from __future__ import annotations

import hashlib
import json
import re
import time
import urllib.request
import urllib.error
from dataclasses import dataclass, field

import numpy as np
import structlog

logger = structlog.get_logger(__name__)

_TIMEOUT = 15
_UA = "Disha-ContinuousTraining/1.0"

def _fetch_url(url: str, timeout: int = _TIMEOUT) -> str:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": _UA})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except (urllib.error.URLError, OSError, TimeoutError) as exc:
        logger.warning("fetch_failed", url=url, error=str(exc))
        return ""

@dataclass
class ThreatScenario:
    source: str
    indicator_type: str
    indicators: list[str] = field(default_factory=list)
    risk_score: float = 0.5
    category: str = "unknown"
    timestamp: float = field(default_factory=time.time)

def fetch_abuse_ch_feodo() -> list[ThreatScenario]:
    url = "https://feodotracker.abuse.ch/downloads/ipblocklist_recommended.txt"
    raw = _fetch_url(url)
    if not raw:
        return []

    ips = []
    for line in raw.splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            if re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$", line):
                ips.append(line)

    if not ips:
        return []

    scenarios = []
    for i in range(0, len(ips), 10):
        batch = ips[i: i + 10]
        scenarios.append(ThreatScenario(
            source="feodo_tracker",
            indicator_type="ip",
            indicators=batch,
            risk_score=0.85,
            category="botnet_c2",
        ))

    logger.info("fetched_feodo", indicators=len(ips), scenarios=len(scenarios))
    return scenarios

def fetch_urlhaus_recent() -> list[ThreatScenario]:
    url = "https://urlhaus.abuse.ch/downloads/text_recent/"
    raw = _fetch_url(url)
    if not raw:
        return []

    urls = []
    for line in raw.splitlines():
        line = line.strip()
        if line and not line.startswith("#") and line.startswith("http"):
            urls.append(line)

    scenarios = []
    for i in range(0, len(urls), 8):
        batch = urls[i: i + 8]
        scenarios.append(ThreatScenario(
            source="urlhaus",
            indicator_type="url",
            indicators=batch,
            risk_score=0.90,
            category="malware_distribution",
        ))

    logger.info("fetched_urlhaus", indicators=len(urls), scenarios=len(scenarios))
    return scenarios

def fetch_threatfox_iocs() -> list[ThreatScenario]:
    url = "https://threatfox.abuse.ch/export/csv/recent/"
    raw = _fetch_url(url)
    if not raw:
        return []

    indicators = []
    for line in raw.splitlines():
        line = line.strip()
        if line and not line.startswith("#") and not line.startswith('"'):
            parts = line.split(",")
            if len(parts) >= 3:
                ioc_value = parts[2].strip().strip('"')
                ioc_type = parts[1].strip().strip('"') if len(parts) > 1 else "unknown"
                indicators.append({"value": ioc_value, "type": ioc_type})

    scenarios = []

    by_type: dict[str, list[str]] = {}
    for ind in indicators:
        t = ind["type"]
        by_type.setdefault(t, []).append(ind["value"])

    for ioc_type, values in by_type.items():
        for i in range(0, len(values), 10):
            batch = values[i: i + 10]
            scenarios.append(ThreatScenario(
                source="threatfox",
                indicator_type=ioc_type,
                indicators=batch,
                risk_score=0.80,
                category="ioc_feed",
            ))

    logger.info("fetched_threatfox", indicators=len(indicators), scenarios=len(scenarios))
    return scenarios

def fetch_all_rl_data() -> list[ThreatScenario]:
    all_scenarios: list[ThreatScenario] = []
    all_scenarios.extend(fetch_abuse_ch_feodo())
    all_scenarios.extend(fetch_urlhaus_recent())
    all_scenarios.extend(fetch_threatfox_iocs())
    logger.info("rl_data_total", scenarios=len(all_scenarios))
    return all_scenarios

@dataclass
class GraphDataset:
    node_features: np.ndarray
    edge_index: np.ndarray
    node_labels: np.ndarray
    node_types: np.ndarray
    metadata: dict = field(default_factory=dict)

def _hash_to_features(text: str, dim: int = 16) -> np.ndarray:
    h = hashlib.sha256(text.encode()).digest()

    features = np.zeros(dim, dtype=np.float32)
    for i in range(min(dim, len(h))):
        features[i] = (h[i] / 255.0) - 0.5
    return features

def build_graph_from_threats(scenarios: list[ThreatScenario], feature_dim: int = 16) -> GraphDataset:
    nodes: list[dict] = []
    node_map: dict[str, int] = {}
    edges_src: list[int] = []
    edges_dst: list[int] = []

    category_to_label = {"botnet_c2": 0, "malware_distribution": 1, "ioc_feed": 2, "unknown": 3}

    for sc in scenarios:

        src_key = f"source:{sc.source}:{sc.category}"
        if src_key not in node_map:
            idx = len(nodes)
            node_map[src_key] = idx
            nodes.append({
                "key": src_key,
                "type": "source",
                "label": category_to_label.get(sc.category, 3),
                "risk": sc.risk_score,
            })

        src_idx = node_map[src_key]

        prev_indicator_idx = None
        for indicator in sc.indicators:
            ind_key = f"indicator:{indicator}"
            if ind_key not in node_map:
                idx = len(nodes)
                node_map[ind_key] = idx
                nodes.append({
                    "key": ind_key,
                    "type": sc.indicator_type,
                    "label": category_to_label.get(sc.category, 3),
                    "risk": sc.risk_score,
                })

            ind_idx = node_map[ind_key]

            edges_src.append(src_idx)
            edges_dst.append(ind_idx)

            edges_src.append(ind_idx)
            edges_dst.append(src_idx)

            if prev_indicator_idx is not None:
                edges_src.append(prev_indicator_idx)
                edges_dst.append(ind_idx)
                edges_src.append(ind_idx)
                edges_dst.append(prev_indicator_idx)

            prev_indicator_idx = ind_idx

    if not nodes:
        return GraphDataset(
            node_features=np.zeros((1, feature_dim), dtype=np.float32),
            edge_index=np.zeros((2, 0), dtype=np.int64),
            node_labels=np.zeros(1, dtype=np.int64),
            node_types=np.zeros(1, dtype=np.int64),
        )

    type_map = {"source": 0, "ip": 1, "domain": 2, "url": 3, "hash": 4}
    node_features = np.zeros((len(nodes), feature_dim), dtype=np.float32)
    node_labels = np.zeros(len(nodes), dtype=np.int64)
    node_types = np.zeros(len(nodes), dtype=np.int64)

    for i, node in enumerate(nodes):
        type_idx = type_map.get(node["type"], 5)
        if type_idx < feature_dim:
            node_features[i, type_idx] = 1.0
        node_features[i, 6] = node["risk"]

        hf = _hash_to_features(node["key"], dim=feature_dim - 7)
        node_features[i, 7:] = hf[: feature_dim - 7]
        node_labels[i] = node["label"]
        node_types[i] = type_idx

    edge_index = np.array([edges_src, edges_dst], dtype=np.int64) if edges_src else np.zeros((2, 0), dtype=np.int64)

    logger.info("graph_built", nodes=len(nodes), edges=edge_index.shape[1] if edge_index.size else 0)

    return GraphDataset(
        node_features=node_features,
        edge_index=edge_index,
        node_labels=node_labels,
        node_types=node_types,
        metadata={
            "num_nodes": len(nodes),
            "num_edges": int(edge_index.shape[1]) if edge_index.size else 0,
            "sources": list(set(sc.source for sc in scenarios)),
        },
    )

_ADVANCED_TEMPLATES = [
    "Evaluate the cybersecurity posture of {sector} after a {attack_type} targeting {target}.",
    "Should {entity} impose sanctions on {country_desc} following {event}?",
    "Assess the constitutional validity of {action} during {crisis_type}.",
    "Analyse the geopolitical implications of {country_desc} developing {capability}.",
    "Evaluate whether {policy} violates {right} under international law.",
    "Should intelligence agencies use {tech} to counter {threat_type} in {region}?",
    "Assess the strategic impact of {event} on regional stability in {region}.",
    "Evaluate the proportionality of {response} to {attack_type} by {threat_actor}.",
    "Should {entity} share classified {intel_type} with {ally} regarding {topic}?",
    "Analyse the legal framework for {action} in the context of {treaty}.",
    "Evaluate the ethical implications of deploying {tech} for {purpose}.",
    "Assess the risk of {threat_type} escalation following {event} in {region}.",
    "Should {entity} authorise pre-emptive {response} against {threat_actor}?",
    "Evaluate the effectiveness of {policy} in countering {threat_type}.",
    "Analyse the diplomatic fallout of {event} between {country_desc} and {ally}.",
]

_ADVANCED_FILLS: dict[str, list[str]] = {
    "sector": ["critical infrastructure", "financial services", "healthcare", "energy grid",
               "telecommunications", "government networks", "defence systems", "transportation"],
    "attack_type": ["ransomware attack", "supply-chain compromise", "zero-day exploitation",
                    "DDoS campaign", "spear-phishing operation", "insider threat",
                    "advanced persistent threat", "watering-hole attack"],
    "target": ["civilian hospitals", "power grids", "election systems", "banking infrastructure",
               "military communications", "satellite networks", "water treatment facilities"],
    "entity": ["the national security council", "parliament", "the UN Security Council",
               "NATO", "the intelligence directorate", "the cybersecurity agency"],
    "country_desc": ["a nuclear-armed neighbour", "a major trading partner",
                     "a non-aligned state", "a rival superpower", "a failing state"],
    "event": ["a massive data breach", "a border skirmish", "an assassination attempt",
              "a propaganda campaign", "a failed coup", "a territorial incursion",
              "a cyber-espionage revelation", "a nuclear test"],
    "action": ["mass surveillance", "internet shutdowns", "preventive detention",
               "emergency censorship", "forced decryption", "biometric registration"],
    "crisis_type": ["a pandemic", "armed conflict", "a terrorism wave",
                    "economic collapse", "a refugee crisis", "civil unrest"],
    "capability": ["hypersonic missiles", "quantum computing", "AI-powered weapons",
                   "space-based weapons", "autonomous drones", "cyber offensive tools"],
    "policy": ["bulk data collection", "social media monitoring",
               "mandatory encryption backdoors", "facial recognition bans",
               "autonomous weapon deployment", "AI-assisted judicial decisions"],
    "right": ["the right to privacy", "freedom of expression", "due process",
              "freedom of assembly", "the right to life", "digital sovereignty"],
    "tech": ["AI surveillance", "predictive policing", "deepfake detection",
             "quantum decryption", "autonomous drones", "behavioural analytics"],
    "threat_type": ["cyber terrorism", "state-sponsored espionage", "radicalisation",
                    "disinformation", "nuclear proliferation", "hybrid warfare"],
    "region": ["South Asia", "Eastern Europe", "the Middle East",
               "the Indo-Pacific", "Central Africa", "the Arctic"],
    "response": ["cyber retaliation", "diplomatic sanctions", "military deployment",
                 "economic blockade", "covert operations", "joint exercises"],
    "threat_actor": ["a state-backed APT group", "a terrorist organisation",
                     "a transnational crime syndicate", "an insider threat network"],
    "intel_type": ["signals intelligence", "human intelligence", "satellite imagery",
                   "cyber threat indicators", "financial intelligence"],
    "ally": ["a Five Eyes partner", "a regional ally", "a strategic competitor",
             "an international organisation", "a private-sector partner"],
    "topic": ["nuclear proliferation", "terrorism financing", "cyber operations",
              "military movements", "election interference"],
    "treaty": ["the Geneva Conventions", "the Budapest Convention", "the Nuclear Non-Proliferation Treaty",
               "the Wassenaar Arrangement", "UN Resolution 2625"],
    "purpose": ["counter-terrorism", "border security", "pandemic control",
                "crime prevention", "military intelligence", "disaster response"],
}

def generate_advanced_scenarios(
    n: int = 500,
    seed: int | None = None,
) -> list[dict]:
    rng = np.random.RandomState(seed)
    scenarios = []

    for i in range(n):
        template = _ADVANCED_TEMPLATES[i % len(_ADVANCED_TEMPLATES)]
        filled = template
        complexity = 0

        for key, values in _ADVANCED_FILLS.items():
            placeholder = "{" + key + "}"
            if placeholder in filled:
                filled = filled.replace(placeholder, rng.choice(values), 1)
                complexity += 1

        base_quality = rng.beta(4 + complexity * 0.5, 3)
        gt_quality = float(np.clip(base_quality, 0.1, 0.95))

        scenarios.append({
            "text": filled,
            "ground_truth_quality": gt_quality,
            "complexity": complexity,
            "id": i,
        })

    logger.info("scenarios_generated", count=len(scenarios))
    return scenarios

def generate_synthetic_threats(n: int = 100, seed: int = 42) -> list[ThreatScenario]:
    rng = np.random.RandomState(seed)
    categories = ["botnet_c2", "malware_distribution", "ioc_feed", "unknown"]
    types = ["ip", "domain", "url", "hash"]
    scenarios = []

    for i in range(n):
        cat = categories[i % len(categories)]
        itype = types[i % len(types)]
        num_indicators = rng.randint(3, 15)

        if itype == "ip":
            indicators = [f"{rng.randint(1, 255)}.{rng.randint(0, 255)}.{rng.randint(0, 255)}.{rng.randint(1, 255)}"
                          for _ in range(num_indicators)]
        elif itype == "domain":
            indicators = [f"malware-{rng.randint(1000, 9999)}.evil-{rng.choice(['com', 'net', 'org', 'io'])}.example"
                          for _ in range(num_indicators)]
        elif itype == "url":
            indicators = [f"http://bad-{rng.randint(100, 999)}.example.com/payload-{rng.randint(1, 100)}"
                          for _ in range(num_indicators)]
        else:

            indicators = [hashlib.sha256(f"malware-{rng.randint(0, 100000)}".encode()).hexdigest()
                          for _ in range(num_indicators)]

        scenarios.append(ThreatScenario(
            source=f"synthetic_{cat}",
            indicator_type=itype,
            indicators=indicators,
            risk_score=float(np.clip(rng.beta(3, 2), 0.1, 0.99)),
            category=cat,
        ))

    return scenarios

def fetch_arxiv_metadata(category: str = "cs.AI", max_results: int = 50) -> list[dict]:
    url = (
        f"https://export.arxiv.org/api/query?"
        f"search_query=cat:{category}&start=0&max_results={max_results}"
        f"&sortBy=submittedDate&sortOrder=descending"
    )
    raw = _fetch_url(url, timeout=20)
    if not raw:
        return []

    papers = []

    entries = re.findall(r"<entry>(.*?)</entry>", raw, re.DOTALL)
    for entry in entries:
        title_m = re.search(r"<title>(.*?)</title>", entry, re.DOTALL)
        summary_m = re.search(r"<summary>(.*?)</summary>", entry, re.DOTALL)
        if title_m and summary_m:
            title = re.sub(r"\s+", " ", title_m.group(1).strip())
            summary = re.sub(r"\s+", " ", summary_m.group(1).strip())
            papers.append({
                "title": title,
                "abstract": summary[:500],
                "category": category,
                "source": "arxiv",
            })

    logger.info("fetched_arxiv", category=category, papers=len(papers))
    return papers

def fetch_oeis_sequences(count: int = 30) -> list[dict]:
    keywords = ["fibonacci", "prime", "catalan", "pascal", "euler", "bernoulli"]
    sequences = []

    for kw in keywords[:3]:
        url = f"https://oeis.org/search?q={kw}&fmt=json"
        raw = _fetch_url(url, timeout=15)
        if not raw:
            continue

        try:
            data = json.loads(raw)
            if isinstance(data, list):
                results = data[:count // len(keywords)]
            elif isinstance(data, dict):
                results = data.get("results", [])[:count // len(keywords)]
            else:
                continue
            for result in results:
                if not isinstance(result, dict):
                    continue
                sequences.append({
                    "id": result.get("number", 0),
                    "name": result.get("name", ""),
                    "data": result.get("data", "")[:200],
                    "source": "oeis",
                    "domain": "mathematics",
                })
        except (json.JSONDecodeError, KeyError, TypeError):
            continue

    logger.info("fetched_oeis", sequences=len(sequences))
    return sequences

def fetch_pubchem_elements(count: int = 30) -> list[dict]:
    elements = []
    url = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON"
    raw = _fetch_url(url, timeout=20)
    if not raw:
        logger.info("fetched_pubchem", elements=0)
        return []

    try:
        data = json.loads(raw)
        table = data.get("Table", {}).get("Row", [])
        for row in table[:count]:
            cells = row.get("Cell", [])
            if len(cells) >= 4:
                elements.append({
                    "atomic_number": cells[0],
                    "symbol": cells[1],
                    "name": cells[2],
                    "atomic_mass": cells[3],
                    "source": "pubchem",
                    "domain": "chemistry",
                })
    except (json.JSONDecodeError, KeyError):
        pass

    logger.info("fetched_pubchem", elements=len(elements))
    return elements

def fetch_open_legal_data() -> list[dict]:

    legal_items = [
        {"text": "We the People of the United States, in Order to form a more perfect Union, establish Justice, insure domestic Tranquility, provide for the common defence, promote the general Welfare, and secure the Blessings of Liberty",
            "type": "preamble", "source": "us_constitution"},
        {"text": "Congress shall make no law respecting an establishment of religion, or prohibiting the free exercise thereof; or abridging the freedom of speech, or of the press",
            "type": "amendment_1", "source": "us_constitution"},
        {"text": "The right of the people to be secure in their persons, houses, papers, and effects, against unreasonable searches and seizures, shall not be violated",
            "type": "amendment_4", "source": "us_constitution"},
        {"text": "No person shall be deprived of life, liberty, or property, without due process of law",
            "type": "amendment_5", "source": "us_constitution"},
        {"text": "All persons born or naturalised in the United States are citizens and entitled to equal protection of the laws",
            "type": "amendment_14", "source": "us_constitution"},
        {
            "text": "Everyone has the right to life, liberty and security of person (UDHR Article 3)",
            "type": "universal_declaration",
            "source": "un_udhr"},
        {
            "text": "No one shall be subjected to torture or to cruel, inhuman or degrading treatment (UDHR Article 5)",
            "type": "universal_declaration",
            "source": "un_udhr"},
        {
            "text": "Everyone has the right to freedom of opinion and expression (UDHR Article 19)",
            "type": "universal_declaration",
            "source": "un_udhr"},
    ]

    logger.info("fetched_legal", items=len(legal_items))
    return legal_items

def fetch_all_academic_data() -> dict[str, list[dict]]:
    return {
        "arxiv_ai": fetch_arxiv_metadata("cs.AI", max_results=20),
        "arxiv_crypto": fetch_arxiv_metadata("cs.CR", max_results=20),
        "arxiv_physics": fetch_arxiv_metadata("quant-ph", max_results=20),
        "arxiv_math": fetch_arxiv_metadata("math.CO", max_results=20),
        "oeis": fetch_oeis_sequences(20),
        "pubchem": fetch_pubchem_elements(30),
        "legal": fetch_open_legal_data(),
    }
