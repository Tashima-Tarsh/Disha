"""
Universal Knowledge Ingestion Engine  loads all knowledge bases,
builds cross-domain training data, and feeds the continuous training pipeline.

Supports all Disha knowledge layers:
  - Physics (classical, modern, quantum, space, ancient, suppressed)
  - Mathematics (algebra, calculus, geometry, probability, discrete)
  - Computing (algorithms, AI/ML, systems, cryptography)
  - Chemistry (all 118 elements, bonding, reactions, organic)
  - Law & Politics (constitutions, political theory, international relations)
  - Cybersecurity (ethical hacking, attack frameworks, defensive)
  - Innovation (space tech, emerging tech, future research)
  - Historical Strategy (battles, tactics, simulation)
"""

from __future__ import annotations

import json
import hashlib
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np
import structlog

logger = structlog.get_logger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[2]

# All knowledge directories
_KNOWLEDGE_DIRS = {
    "physics": REPO_ROOT / "quantum-physics" / "backend" / "knowledge",
    "mathematics": REPO_ROOT / "knowledge-base" / "mathematics",
    "computing": REPO_ROOT / "knowledge-base" / "computing",
    "chemistry": REPO_ROOT / "knowledge-base" / "chemistry",
    "law": REPO_ROOT / "knowledge-base" / "law",
    "innovation": REPO_ROOT / "knowledge-base" / "innovation",
    "cybersecurity": REPO_ROOT / "knowledge-base" / "cybersecurity",
    "history": REPO_ROOT / "historical-strategy" / "data",
}


@dataclass
class KnowledgeItem:
    """A single piece of knowledge extracted from a domain."""
    domain: str
    topic: str
    text: str
    concepts: list[str] = field(default_factory=list)
    equations: list[str] = field(default_factory=list)
    difficulty: float = 0.5  # 0=basic, 1=advanced
    cross_references: list[str] = field(default_factory=list)


@dataclass
class KnowledgeCorpus:
    """The full knowledge corpus across all domains."""
    items: list[KnowledgeItem] = field(default_factory=list)
    domain_counts: dict[str, int] = field(default_factory=dict)


def _load_json_safe(path: Path) -> dict | list:
    """Load JSON file, returning empty dict on failure."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.warning("json_load_failed", path=str(path), error=str(e))
        return {}


def _extract_text_recursive(obj: Any, depth: int = 0) -> list[str]:
    """Recursively extract all text values from a JSON object."""
    texts = []
    if depth > 10:
        return texts
    if isinstance(obj, str) and len(obj) > 10:
        texts.append(obj)
    elif isinstance(obj, list):
        for item in obj:
            texts.extend(_extract_text_recursive(item, depth + 1))
    elif isinstance(obj, dict):
        for v in obj.values():
            texts.extend(_extract_text_recursive(v, depth + 1))
    return texts


def _extract_concepts(obj: Any) -> list[str]:
    """Extract concept-like short strings from JSON."""
    concepts = []
    if isinstance(obj, str) and 2 < len(obj) < 80:
        concepts.append(obj)
    elif isinstance(obj, list):
        for item in obj:
            if isinstance(item, str) and 2 < len(item) < 80:
                concepts.append(item)
            elif isinstance(item, dict):
                for k in ["name", "id", "concept", "topic", "symbol"]:
                    if k in item and isinstance(item[k], str):
                        concepts.append(item[k])
    elif isinstance(obj, dict):
        for k in ["name", "id", "concept", "topic", "symbol", "algorithm"]:
            if k in obj and isinstance(obj[k], str):
                concepts.append(obj[k])
    return concepts


# 
# Domain-specific extractors
# 

def _extract_physics(data: dict) -> list[KnowledgeItem]:
    """Extract knowledge items from physics JSON files."""
    items = []
    domain_name = data.get("domain", "Physics")

    # Handle theories list
    for theory in data.get("theories", []):
        concepts = theory.get("concepts", [])
        equations = theory.get("key_equations", [])
        desc = theory.get("description", "")
        name = theory.get("name", "Unknown")

        items.append(KnowledgeItem(
            domain="physics",
            topic=f"{domain_name}: {name}",
            text=f"{name}: {desc}",
            concepts=concepts,
            equations=equations,
            difficulty=0.6,
        ))

    # Handle topics list (quantum_physics.json, space_science.json)
    for topic in data.get("topics", []):
        name = topic.get("name", topic.get("id", "Unknown"))
        desc = topic.get("description", "")
        concepts_raw = topic.get("concepts", []) + topic.get("key_facts", [])
        equations = topic.get("key_equations", topic.get("key_laws", []))
        if isinstance(equations, list):
            equations = [str(e) for e in equations]
        else:
            equations = []

        items.append(KnowledgeItem(
            domain="physics",
            topic=f"{domain_name}: {name}",
            text=f"{name}: {desc}",
            concepts=[str(c) for c in concepts_raw],
            equations=equations,
            difficulty=0.7,
        ))

    return items


def _extract_chemistry(data: dict) -> list[KnowledgeItem]:
    """Extract knowledge items from chemistry/periodic table data."""
    items = []

    # Periodic table elements
    pt = data.get("periodic_table", {})
    for elem in pt.get("elements", []):
        name = elem.get("name", "Unknown")
        symbol = elem.get("symbol", "?")
        z = elem.get("Z", 0)
        mass = elem.get("mass", 0)
        cat = elem.get("category", "unknown")
        config = elem.get("electron_config", "")
        apps = elem.get("applications", [])

        text = f"Element {z}: {name} ({symbol}), atomic mass {mass}, category: {cat}"
        if config:
            text += f", electron configuration: {config}"
        if apps:
            text += f", applications: {', '.join(apps)}"

        items.append(KnowledgeItem(
            domain="chemistry",
            topic=f"Element: {name} ({symbol})",
            text=text,
            concepts=[name, symbol, cat] + apps,
            difficulty=0.3 if z <= 20 else 0.6,
        ))

    # Bonding
    for btype in data.get("bonding", {}).get("types", []):
        items.append(KnowledgeItem(
            domain="chemistry",
            topic=f"Chemical Bonding: {btype}",
            text=f"Chemical bond type: {btype}",
            concepts=[btype],
            difficulty=0.4,
        ))

    # Reactions
    for rtype in data.get("reactions", {}).get("types", []):
        items.append(KnowledgeItem(
            domain="chemistry",
            topic=f"Reaction: {rtype}",
            text=f"Chemical reaction type: {rtype}",
            concepts=[rtype],
            difficulty=0.4,
        ))

    # Organic chemistry
    for fg in data.get("organic_chemistry", {}).get("functional_groups", []):
        items.append(KnowledgeItem(
            domain="chemistry",
            topic=f"Organic: {fg}",
            text=f"Organic chemistry functional group: {fg}",
            concepts=[fg],
            difficulty=0.5,
        ))

    return items


def _extract_mathematics(data: dict) -> list[KnowledgeItem]:
    """Extract knowledge items from mathematics data."""
    items = []
    for branch in data.get("branches", []):
        name = branch.get("name", "Mathematics")
        branch.get("id", "")

        # Extract theorems
        for theorem in branch.get("key_theorems", branch.get("fundamental_theorems", [])):
            items.append(KnowledgeItem(
                domain="mathematics",
                topic=f"Math/{name}",
                text=theorem if isinstance(theorem, str) else str(theorem),
                concepts=[name],
                difficulty=0.7,
            ))

        # Extract concepts
        concepts = branch.get("key_concepts", branch.get("concepts", []))
        if concepts:
            items.append(KnowledgeItem(
                domain="mathematics",
                topic=f"Math/{name}: Concepts",
                text=f"{name} core concepts: {', '.join(str(c) for c in concepts[:10])}",
                concepts=[str(c) for c in concepts],
                difficulty=0.5,
            ))

        # Extract distributions (probability)
        for dist in branch.get("distributions", []):
            if isinstance(dist, dict):
                dname = dist.get("name", "")
                pdf = dist.get("pdf", dist.get("pmf", ""))
                items.append(KnowledgeItem(
                    domain="mathematics",
                    topic=f"Math/Probability: {dname}",
                    text=f"{dname} distribution: {pdf}",
                    equations=[pdf] if pdf else [],
                    difficulty=0.6,
                ))

        # Extract structures (algebra)
        for struct in branch.get("key_structures", []):
            if isinstance(struct, dict):
                sname = struct.get("name", "")
                sdef = struct.get("definition", "")
                items.append(KnowledgeItem(
                    domain="mathematics",
                    topic=f"Math/Algebra: {sname}",
                    text=f"{sname}: {sdef}",
                    concepts=[sname],
                    difficulty=0.7,
                ))

    return items


def _extract_computing(data: dict) -> list[KnowledgeItem]:
    """Extract knowledge items from computing data."""
    items = []
    for branch in data.get("branches", []):
        branch.get("name", "Computing")

        # Algorithms & data structures
        for algo in branch.get("sorting", []):
            if isinstance(algo, dict):
                aname = algo.get("name", "")
                items.append(KnowledgeItem(
                    domain="computing",
                    topic=f"Computing/Algorithms: {aname}",
                    text=f"Sorting algorithm {aname}: avg {algo.get('avg', '?')}, worst {algo.get('worst', '?')}",
                    concepts=[aname],
                    difficulty=0.5,
                ))

        for ds in branch.get("data_structures", []):
            if isinstance(ds, dict):
                dname = ds.get("name", "")
                items.append(KnowledgeItem(
                    domain="computing",
                    topic=f"Computing/Data Structures: {dname}",
                    text=f"Data structure {dname}: access {ds.get('access', '?')}, insert {ds.get('insert', '?')}",
                    concepts=[dname],
                    difficulty=0.5,
                ))

        # Complexity classes
        for cls in branch.get("complexity_classes", []):
            items.append(KnowledgeItem(
                domain="computing",
                topic=f"Computing/Complexity: {cls}",
                text=f"Complexity class {cls}",
                concepts=[cls],
                difficulty=0.8,
            ))

        # AI/ML sub-fields
        for subfield in branch.get("sub_fields", []):
            if isinstance(subfield, dict):
                sf_name = subfield.get("name", "")
                algos = subfield.get("algorithms", subfield.get("architectures", []))
                items.append(KnowledgeItem(
                    domain="computing",
                    topic=f"Computing/AI: {sf_name}",
                    text=f"{sf_name}: {', '.join(str(a) for a in algos[:8])}",
                    concepts=[str(a) for a in algos],
                    difficulty=0.6,
                ))

        # Programming languages
        for lang in branch.get("major_languages", []):
            if isinstance(lang, dict):
                lname = lang.get("name", "")
                items.append(KnowledgeItem(
                    domain="computing",
                    topic=f"Computing/Language: {lname}",
                    text=f"Programming language {lname}: {lang.get('paradigm', '')}, {lang.get('typing', '')}",
                    concepts=[lname],
                    difficulty=0.4,
                ))

    return items


def _extract_law(data: dict) -> list[KnowledgeItem]:
    """Extract knowledge items from law & politics data."""
    items = []

    # Constitutions
    for const in data.get("constitutional_frameworks", {}).get("key_constitutions", []):
        if isinstance(const, dict):
            country = const.get("country", "Unknown")
            features = const.get("features", [])
            items.append(KnowledgeItem(
                domain="law",
                topic=f"Law/Constitution: {country}",
                text=f"Constitution of {country} ({const.get('year', '?')}): {', '.join(features)}",
                concepts=features,
                difficulty=0.6,
            ))

    # Fundamental rights
    for right in data.get("constitutional_frameworks", {}).get("fundamental_rights", []):
        items.append(KnowledgeItem(
            domain="law",
            topic=f"Law/Rights: {right}",
            text=f"Fundamental right: {right}",
            concepts=[right],
            difficulty=0.4,
        ))

    # Political ideologies
    for ideo in data.get("political_theory", {}).get("ideologies", []):
        if isinstance(ideo, dict):
            name = ideo.get("name", "")
            principles = ideo.get("principles", [])
            thinkers = ideo.get("key_thinkers", [])
            items.append(KnowledgeItem(
                domain="law",
                topic=f"Politics/Ideology: {name}",
                text=f"{name}: principles include {', '.join(principles)}. Key thinkers: {', '.join(thinkers)}",
                concepts=principles + thinkers,
                difficulty=0.5,
            ))

    # Cyber law
    for framework in data.get("cyber_law", {}).get("frameworks", []):
        items.append(KnowledgeItem(
            domain="law",
            topic=f"Law/Cyber: {framework}",
            text=f"Cyber law framework: {framework}",
            concepts=[framework],
            difficulty=0.6,
        ))

    return items


def _extract_cybersecurity(data: dict) -> list[KnowledgeItem]:
    """Extract knowledge items from cybersecurity data."""
    items = []

    # Ethical hacking phases
    for phase in data.get("ethical_hacking", {}).get("methodology", []):
        if isinstance(phase, dict):
            name = phase.get("name", "")
            tools = phase.get("tools", [])
            techniques = phase.get("techniques", [])
            items.append(KnowledgeItem(
                domain="cybersecurity",
                topic=f"CyberSec/Hacking Phase {phase.get('phase', '?')}: {name}",
                text=f"Ethical hacking phase: {name}. Tools: {', '.join(tools[:5])}. Techniques: {', '.join(techniques[:5])}",
                concepts=tools + techniques,
                difficulty=0.6,
            ))

    # OWASP Top 10
    for vuln in data.get("attack_frameworks", {}).get("owasp_top_10", []):
        items.append(KnowledgeItem(
            domain="cybersecurity",
            topic=f"CyberSec/OWASP: {vuln}",
            text=f"OWASP vulnerability: {vuln}",
            concepts=[vuln],
            difficulty=0.5,
        ))

    # MITRE ATT&CK tactics
    for tactic in data.get("attack_frameworks", {}).get("mitre_attack", {}).get("tactics", []):
        items.append(KnowledgeItem(
            domain="cybersecurity",
            topic=f"CyberSec/MITRE: {tactic}",
            text=f"MITRE ATT&CK tactic: {tactic}",
            concepts=[tactic],
            difficulty=0.5,
        ))

    # Tools
    for category, tools_data in data.get("hacking_tools_categories", {}).items():
        if isinstance(tools_data, dict):
            for subcategory, tool_list in tools_data.items():
                if isinstance(tool_list, list):
                    for tool in tool_list:
                        if isinstance(tool, str):
                            items.append(KnowledgeItem(
                                domain="cybersecurity",
                                topic=f"CyberSec/Tool: {tool}",
                                text=f"Security tool {tool} ({category}/{subcategory})",
                                concepts=[tool, category, subcategory],
                                difficulty=0.5,
                            ))

    return items


def _extract_innovation(data: dict) -> list[KnowledgeItem]:
    """Extract knowledge items from innovation/future tech data."""
    items = []

    # Space tech
    for rocket in data.get("space_technologies", {}).get("launch_systems", []):
        if isinstance(rocket, dict):
            name = rocket.get("name", "")
            items.append(KnowledgeItem(
                domain="innovation",
                topic=f"Space/Launch: {name}",
                text=f"Launch system {name}: {rocket.get('type', '')}, payload to LEO: {rocket.get('payload_leo_kg', '?')}kg, reusable: {rocket.get('reusable', '?')}",
                concepts=[name],
                difficulty=0.5,
            ))

    # Emerging tech categories
    for category, tech_data in data.get("emerging_technologies", {}).items():
        if isinstance(tech_data, dict):
            for sub_key, sub_val in tech_data.items():
                if isinstance(sub_val, list):
                    for item_val in sub_val[:5]:
                        text = str(item_val) if isinstance(item_val, str) else json.dumps(item_val)
                        if len(text) > 5:
                            items.append(KnowledgeItem(
                                domain="innovation",
                                topic=f"Innovation/{category}: {sub_key}",
                                text=text,
                                concepts=[category, sub_key],
                                difficulty=0.6,
                            ))

    # Future research
    for field_name, problems in data.get("future_research_frontiers", {}).items():
        if isinstance(problems, list):
            for problem in problems:
                items.append(KnowledgeItem(
                    domain="innovation",
                    topic=f"Future/{field_name}: {problem}",
                    text=f"Research frontier in {field_name}: {problem}",
                    concepts=[problem, field_name],
                    difficulty=0.9,
                ))

    return items


def _extract_history(data: list | dict) -> list[KnowledgeItem]:
    """Extract knowledge items from historical strategy data."""
    items = []
    battles = data if isinstance(data, list) else []

    for battle in battles:
        if not isinstance(battle, dict):
            continue
        name = battle.get("name", "Unknown")
        desc = battle.get("description", "")
        tactics = battle.get("key_tactics", [])
        lessons = battle.get("lessons", [])
        strategy = battle.get("strategy_type", "")
        terrain = battle.get("terrain", "")

        text = f"{name} ({battle.get('year', '?')}): {desc}"
        concepts = tactics + lessons + [strategy, terrain]

        items.append(KnowledgeItem(
            domain="history",
            topic=f"History/Battle: {name}",
            text=text,
            concepts=[c for c in concepts if c],
            difficulty=0.5,
        ))

    return items


# 
# Main loading function
# 

_EXTRACTORS = {
    "physics": _extract_physics,
    "mathematics": _extract_mathematics,
    "computing": _extract_computing,
    "chemistry": _extract_chemistry,
    "law": _extract_law,
    "cybersecurity": _extract_cybersecurity,
    "innovation": _extract_innovation,
    "history": _extract_history,
}


def load_all_knowledge() -> KnowledgeCorpus:
    """Load and extract knowledge items from all domains."""
    corpus = KnowledgeCorpus()

    for domain_name, knowledge_dir in _KNOWLEDGE_DIRS.items():
        if not knowledge_dir.exists():
            logger.warning("knowledge_dir_missing", domain=domain_name, path=str(knowledge_dir))
            continue

        extractor = _EXTRACTORS.get(domain_name)
        if not extractor:
            continue

        count = 0
        for json_file in sorted(knowledge_dir.glob("*.json")):
            data = _load_json_safe(json_file)
            if not data:
                continue

            try:
                items = extractor(data)
                corpus.items.extend(items)
                count += len(items)
            except Exception as e:
                logger.warning("extraction_failed", file=str(json_file), error=str(e))

        corpus.domain_counts[domain_name] = count
        logger.info("knowledge_loaded", domain=domain_name, items=count)

    logger.info("total_knowledge_loaded", total_items=len(corpus.items), domains=len(corpus.domain_counts))
    return corpus


# 
# Knowledge  Training data transforms
# 

def _text_to_features(text: str, dim: int = 32) -> np.ndarray:
    """Convert text to a deterministic feature vector using character hashing."""
    h = hashlib.sha256(text.encode()).digest()
    features = np.zeros(dim, dtype=np.float32)
    for i in range(min(dim, len(h))):
        features[i] = (h[i] / 255.0) - 0.5
    # Add text length and word count as features
    if dim > 2:
        features[-2] = min(len(text) / 500.0, 1.0)
        features[-1] = min(len(text.split()) / 100.0, 1.0)
    return features


# Domain encoding for node features
_DOMAIN_IDS = {
    "physics": 0, "mathematics": 1, "computing": 2,
    "chemistry": 3, "law": 4, "cybersecurity": 5,
    "innovation": 6, "history": 7,
}


def build_knowledge_graph(corpus: KnowledgeCorpus, feature_dim: int = 32) -> dict:
    """Build a cross-domain knowledge graph from the corpus.

    Returns dict with node_features, edge_index, node_labels, node_types, metadata
    suitable for GNN training.
    """
    nodes: list[dict] = []
    node_map: dict[str, int] = {}
    edges_src: list[int] = []
    edges_dst: list[int] = []

    # Create domain hub nodes
    for domain, did in _DOMAIN_IDS.items():
        key = f"domain:{domain}"
        idx = len(nodes)
        node_map[key] = idx
        nodes.append({
            "key": key,
            "domain": domain,
            "type": "domain_hub",
            "label": did,
            "difficulty": 0.5,
        })

    # Create item nodes and edges
    concept_nodes: dict[str, int] = {}

    for item in corpus.items:
        item_key = f"item:{item.domain}:{item.topic}"
        if item_key in node_map:
            continue

        idx = len(nodes)
        node_map[item_key] = idx
        nodes.append({
            "key": item_key,
            "domain": item.domain,
            "type": "knowledge_item",
            "label": _DOMAIN_IDS.get(item.domain, 7),
            "difficulty": item.difficulty,
        })

        # Edge to domain hub
        domain_hub = node_map.get(f"domain:{item.domain}")
        if domain_hub is not None:
            edges_src.extend([idx, domain_hub])
            edges_dst.extend([domain_hub, idx])

        # Create concept nodes and cross-links
        for concept in item.concepts[:5]:  # Limit to 5 per item
            c_key = f"concept:{concept.lower().strip()}"
            if c_key not in concept_nodes:
                c_idx = len(nodes)
                concept_nodes[c_key] = c_idx
                node_map[c_key] = c_idx
                nodes.append({
                    "key": c_key,
                    "domain": item.domain,
                    "type": "concept",
                    "label": _DOMAIN_IDS.get(item.domain, 7),
                    "difficulty": item.difficulty,
                })

            c_idx = concept_nodes[c_key]
            edges_src.extend([idx, c_idx])
            edges_dst.extend([c_idx, idx])

    # Build numpy arrays
    node_features = np.zeros((len(nodes), feature_dim), dtype=np.float32)
    node_labels = np.zeros(len(nodes), dtype=np.int64)
    node_types_arr = np.zeros(len(nodes), dtype=np.int64)

    type_map = {"domain_hub": 0, "knowledge_item": 1, "concept": 2}

    for i, node in enumerate(nodes):
        # One-hot domain encoding (first 8 features)
        did = _DOMAIN_IDS.get(node["domain"], 7)
        if did < feature_dim:
            node_features[i, did] = 1.0

        # Type encoding
        tid = type_map.get(node["type"], 0)
        if 8 + tid < feature_dim:
            node_features[i, 8 + tid] = 1.0

        # Difficulty
        if 11 < feature_dim:
            node_features[i, 11] = node.get("difficulty", 0.5)

        # Hash-based content features
        hf = _text_to_features(node["key"], dim=feature_dim - 12)
        node_features[i, 12:] = hf[:feature_dim - 12]

        node_labels[i] = node["label"]
        node_types_arr[i] = tid

    edge_index = np.array([edges_src, edges_dst], dtype=np.int64) if edges_src else np.zeros((2, 0), dtype=np.int64)

    logger.info("knowledge_graph_built",
                nodes=len(nodes),
                edges=edge_index.shape[1] if edge_index.size else 0,
                domains=len(_DOMAIN_IDS))

    return {
        "node_features": node_features,
        "edge_index": edge_index,
        "node_labels": node_labels,
        "node_types": node_types_arr,
        "metadata": {
            "num_nodes": len(nodes),
            "num_edges": int(edge_index.shape[1]) if edge_index.size else 0,
            "domains": list(corpus.domain_counts.keys()),
            "domain_counts": corpus.domain_counts,
            "feature_dim": feature_dim,
        },
    }


def generate_cross_domain_scenarios(
    corpus: KnowledgeCorpus,
    n: int = 300,
    seed: int | None = None,
) -> list[dict]:
    """Generate cross-domain decision scenarios using knowledge items.

    Creates scenarios that require reasoning across multiple domains,
    suitable for training the decision engine.
    """
    rng = np.random.RandomState(seed)

    _CROSS_TEMPLATES = [
        "Evaluate the {domain1} implications of {concept1} on {domain2} applications involving {concept2}.",
        "Should governments regulate {concept1} ({domain1}) given its impact on {concept2} ({domain2})?",
        "Assess the risk of applying {concept1} from {domain1} to solve problems in {domain2} involving {concept2}.",
        "Analyse how advances in {concept1} ({domain1}) could transform {concept2} in {domain2}.",
        "Evaluate the ethical considerations of using {concept1} ({domain1}) for {concept2} ({domain2}).",
        "Compare the approaches of {domain1} ({concept1}) and {domain2} ({concept2}) to solving complex problems.",
        "Should {concept1} from {domain1} be taught alongside {concept2} from {domain2} in education?",
        "Assess the strategic value of combining {domain1} knowledge of {concept1} with {domain2} expertise in {concept2}.",
        "Evaluate whether {concept1} ({domain1}) contradicts or supports {concept2} ({domain2}).",
        "Analyse the future impact of integrating {domain1} ({concept1}) with {domain2} ({concept2}) research.",
    ]

    # Group items by domain
    by_domain: dict[str, list[KnowledgeItem]] = {}
    for item in corpus.items:
        by_domain.setdefault(item.domain, []).append(item)

    domains = list(by_domain.keys())
    if len(domains) < 2:
        domains = domains * 2  # Fallback if only 1 domain

    scenarios = []
    for i in range(n):
        template = _CROSS_TEMPLATES[i % len(_CROSS_TEMPLATES)]

        d1, d2 = rng.choice(domains, size=2, replace=False) if len(domains) >= 2 else (domains[0], domains[0])
        item1 = rng.choice(by_domain[d1]) if by_domain[d1] else None
        item2 = rng.choice(by_domain[d2]) if by_domain[d2] else None

        if item1 is None or item2 is None:
            continue

        c1 = rng.choice(item1.concepts) if item1.concepts else item1.topic
        c2 = rng.choice(item2.concepts) if item2.concepts else item2.topic

        text = template.format(
            domain1=d1, domain2=d2,
            concept1=c1, concept2=c2,
        )

        # Quality from cross-domain complexity:
        # beta(, ) where  increases with complexity for higher-quality scenarios.
        #  = 4 + complexity*0.5: baseline of 4 shifts right with more placeholders
        #  = 3: keeps the mode around 0.6 for moderate complexity
        # Clipped to [0.1, 0.95] to avoid extreme scores that can't be calibrated.
        complexity = 2 + (1 if d1 != d2 else 0) + len(item1.concepts[:3]) * 0.1
        gt_quality = float(np.clip(rng.beta(4 + complexity * 0.5, 3), 0.1, 0.95))

        scenarios.append({
            "text": text,
            "ground_truth_quality": gt_quality,
            "complexity": complexity,
            "domains": [d1, d2],
            "id": i,
        })

    logger.info("cross_domain_scenarios_generated", count=len(scenarios))
    return scenarios


def generate_knowledge_rl_scenarios(
    corpus: KnowledgeCorpus,
    n: int = 100,
    seed: int | None = None,
) -> list[dict]:
    """Generate RL investigation scenarios enriched by knowledge.

    Creates investigation scenarios where the agent must navigate
    through knowledge domains to find answers.
    """
    rng = np.random.RandomState(seed)
    scenarios = []

    for i in range(n):
        item = corpus.items[rng.randint(len(corpus.items))]
        num_clues = rng.randint(3, 8)
        related = [c for c in item.concepts[:num_clues]]

        scenarios.append({
            "domain": item.domain,
            "topic": item.topic,
            "clues": related,
            "difficulty": item.difficulty,
            "risk_score": float(rng.beta(2, 5)),
            "id": i,
        })

    return scenarios
