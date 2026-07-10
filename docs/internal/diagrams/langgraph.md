# LangGraph Diagram for Disha 7-Stage Cognitive Loop

`mermaid
stateDiagram-v2
    direction TB
    [*] --> Perceive
    Perceive --> Attend : entities extracted
    Attend --> Reason : context retrieved
    Reason --> Deliberate : hypotheses generated
    Deliberate --> Act : consensus reached
    
    Act --> CheckConfidence
    CheckConfidence --> Reflect : confidence >= 0.45
    CheckConfidence --> Clarify : else
    
    Reflect --> Consolidate
    Consolidate --> [*]
    
    state Clarify {
        [*] --> AskUser
        AskUser --> [*]
    }
    
    note right of Perceive
        Extract intent + entities
    end note
    
    note right of Deliberate
        Multi-agent debate
    end note
`

**This matches your cognitive_loop.py stages and can be implemented with LangGraph StateGraph.**
