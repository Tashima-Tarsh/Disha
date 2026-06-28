# LangChain LCEL Diagram for Disha

`mermaid
flowchart TD
    A[User Input] --> B[Perceive Prompt]
    B --> C[ChatOpenAI LLM]
    C --> D[JSON Parser]
    D --> E[Entities + Intent]
    E --> F[Attend Prompt + Memory]
    F --> G[LLM]
    G --> H[Context]
    H --> I[Reason Prompt]
    I --> J[LLM]
    J --> K[Hypotheses]
    K --> L[Deliberate Prompt]
    L --> M[LLM]
    M --> N[Consensus]
    N --> O[Act Prompt]
    O --> P[LLM]
    P --> Q[Final Action + Report]
    
    style C fill:#f9f,stroke:#333
    style G fill:#f9f,stroke:#333
    style J fill:#f9f,stroke:#333
    style M fill:#f9f,stroke:#333
    style P fill:#f9f,stroke:#333
`

**This is the LCEL chain from langchain_disha.py**
