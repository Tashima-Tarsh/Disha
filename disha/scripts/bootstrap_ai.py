import json
import os

def bootstrap_data():
    base_path = "disha/ai/core/decision_engine/data"
    raw_path = os.path.join(base_path, "raw")
    index_path = os.path.join(base_path, "index")

    os.makedirs(raw_path, exist_ok=True)
    os.makedirs(index_path, exist_ok=True)

    # 1. Constitutional / Legal Data (Open Source Samples)
    legal_clauses = [
        "Article 14: Equality before law. The State shall not deny to any person equality before the law or the equal protection of the laws.",
        "Article 19: Protection of certain rights regarding freedom of speech, etc.",
        "Article 21: Protection of life and personal liberty. No person shall be deprived of his life or personal liberty except according to procedure established by law.",
        "Precedent: Kesavananda Bharati v. State of Kerala (1973) - Established basic structure doctrine.",
        "Section 66A: Punishment for sending offensive messages through communication service (Struck down by Shreya Singhal v. Union of India)."
    ]
    
    legal_raw_file = os.path.join(raw_path, "constitution.txt")
    with open(legal_raw_file, "w", encoding="utf-8") as f:
        f.write("\n".join(legal_clauses))

    # 2. Security / Threat Intel Data (Open Source Signatures)
    security_signatures = [
        "CVE-2021-44228: Log4j Remote Code Execution vulnerability in JNDI features.",
        "T1059.001: PowerShell execution - Threat actors use PowerShell to execute malicious commands.",
        "MITRE ATT&CK: Persistence technique via Scheduled Tasks/Jobs.",
        "Indicators: 192.168.1.100 (Simulated C2), malicous-domain.top (Phishing).",
        "Zero Trust Principle: Never trust, always verify for all internal network traffic."
    ]
    
    security_raw_file = os.path.join(raw_path, "security_intel.txt")
    with open(security_raw_file, "w", encoding="utf-8") as f:
        f.write("\n".join(security_signatures))

    # 3. Simple Indexing (Simulating the SimpleRetriever build process)
    def build_dummy_index(raw_file, name):
        with open(raw_file, "r", encoding="utf-8") as f:
            docs = [l.strip() for l in f if l.strip()]
        
        # SimpleRetriever expects a JSON list of strings for the index
        with open(os.path.join(index_path, f"{name}.json"), "w", encoding="utf-8") as f:
            json.dump(docs, f)
            
        # Metadata expected by LegalAgent
        meta = [{"id": i, "text": d} for i, d in enumerate(docs)]
        with open(os.path.join(index_path, f"{name}_meta.json"), "w", encoding="utf-8") as f:
            json.dump(meta, f)

    build_dummy_index(legal_raw_file, "constitution")
    build_dummy_index(security_raw_file, "security")

    print("DISHA AI Bootstrap Complete: Open Source data layers populated.")

if __name__ == "__main__":
    bootstrap_data()
