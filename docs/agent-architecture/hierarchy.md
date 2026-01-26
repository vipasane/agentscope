```mermaid
%%{init: {"theme":"default","themeVariables":{"background":"#ffffff","primaryBorderColor":"#e0e0e0","primaryTextColor":"#212121","secondaryTextColor":"#757575","primaryColor":"#fafafa","secondaryColor":"#e3f2fd","tertiaryColor":"#fff8e1","lineColor":"#e0e0e0","fontSize":"14px","fontFamily":"system-ui, -apple-system, sans-serif"}}}%%
graph TB
    %% Agent Hierarchy - Category View

    subgraph github["🐙 GitHub (14)"]
        code_review_swarm["code-review-swarm"]
        github_modes["github-modes"]
        issue_tracker["issue-tracker"]
        multi_repo_swarm["multi-repo-swarm"]
        pr_manager["pr-manager"]
        project_board_sync["project-board-sync"]
        release_manager["release-manager"]
        release_swarm["release-swarm"]
        repo_architect["repo-architect"]
        swarm_issue["swarm-issue"]
        swarm_pr["swarm-pr"]
        sync_coordinator["sync-coordinator"]
        workflow_automation["workflow-automation"]
    end

    subgraph other["📦 Other (14)"]
        _code_analyzer_[""code-analyzer""]
        _system_architect_[""system-architect""]
        browser_agent["browser-agent"]
        _ml_developer_[""ml-developer""]
        _cicd_engineer_[""cicd-engineer""]
        Performance_Monitor["Performance Monitor"]
        Resource_Allocator["Resource Allocator"]
        Topology_Optimizer["Topology Optimizer"]
        _mobile_dev_[""mobile-dev""]
    end

    subgraph coordination["👑 Coordination (11)"]
        planner[["planner"]]
        adaptive_coordinator[["adaptive-coordinator"]]
        hierarchical_coordinator[["hierarchical-coordinator"]]
        mesh_coordinator[["mesh-coordinator"]]
        collective_intelligence_coordinator[["collective-intelligence-coordinator"]]
        swarm_memory_manager[["swarm-memory-manager"]]
        Load_Balancing_Coordinator["Load Balancing Coordinator"]
        smart_agent["smart-agent"]
        swarm_init["swarm-init"]
        memory_coordinator["memory-coordinator"]
        task_orchestrator["task-orchestrator"]
    end

    subgraph flow_nexus["🌊 Flow Nexus (9)"]
        flow_nexus_app_store["flow-nexus-app-store"]
        flow_nexus_auth["flow-nexus-auth"]
        flow_nexus_challenges["flow-nexus-challenges"]
        flow_nexus_neural["flow-nexus-neural"]
        flow_nexus_payments["flow-nexus-payments"]
        flow_nexus_sandbox["flow-nexus-sandbox"]
        flow_nexus_swarm["flow-nexus-swarm"]
        flow_nexus_user_tools["flow-nexus-user-tools"]
        flow_nexus_workflow["flow-nexus-workflow"]
    end

    subgraph security["🔒 Security (8)"]
        security_manager["security-manager"]
        aidefence_guardian["aidefence-guardian"]
        claims_authorizer["claims-authorizer"]
        injection_analyst["injection-analyst"]
        pii_detector["pii-detector"]
        security_architect_aidefence["security-architect-aidefence"]
        security_architect["security-architect"]
        security_auditor["security-auditor"]
    end

    subgraph performance["📈 Performance (8)"]
        performance_benchmarker["performance-benchmarker"]
        Benchmark_Suite["Benchmark Suite"]
        matrix_optimizer["matrix-optimizer"]
        pagerank_analyzer["pagerank-analyzer"]
        performance_optimizer["performance-optimizer"]
        trading_predictor["trading-predictor"]
        perf_analyzer["perf-analyzer"]
        performance_engineer["performance-engineer"]
    end

    subgraph sparc["⚡ SPARC (7)"]
        sparc_orchestrator[["sparc-orchestrator"]]
        architecture["architecture"]
        pseudocode["pseudocode"]
        refinement["refinement"]
        specification["specification"]
        sparc_coder["sparc-coder"]
        sparc_coord["sparc-coord"]
    end

    subgraph development["💻 Development (7)"]
        coder["coder"]
        _backend_dev_[""backend-dev""]
        sublinear_goal_planner["sublinear-goal-planner"]
        goal_planner["goal-planner"]
        agentic_payments["agentic-payments"]
        base_template_generator["base-template-generator"]
    end

    subgraph consensus["🤝 Consensus (6)"]
        byzantine_coordinator[["byzantine-coordinator"]]
        gossip_coordinator[["gossip-coordinator"]]
        quorum_manager[["quorum-manager"]]
        raft_manager[["raft-manager"]]
        consensus_coordinator[["consensus-coordinator"]]
        crdt_synchronizer["crdt-synchronizer"]
    end

    subgraph v3_core["🚀 V3 Core (5)"]
        sona_learning_optimizer["sona-learning-optimizer"]
        adr_architect["adr-architect"]
        ddd_domain_expert["ddd-domain-expert"]
        reasoningbank_learner(["reasoningbank-learner"])
        v3_integration_architect["v3-integration-architect"]
    end

    subgraph testing["🧪 Testing (5)"]
        reviewer["reviewer"]
        tester["tester"]
        test_long_runner["test-long-runner"]
        production_validator["production-validator"]
        tdd_london_swarm["tdd-london-swarm"]
    end

    subgraph analysis["🔍 Analysis (2)"]
        analyst["analyst"]
        researcher["researcher"]
    end

    subgraph documentation["📚 Documentation (2)"]
        _api_docs_[""api-docs""]
    end

    subgraph memory["🧠 Memory (1)"]
        memory_specialist(["memory-specialist"])
    end

    %% Delegation Relationships

    %% Skills
    skill__AgentDB_Advanced_Features_([""AgentDB Advanced Features""])
    skill__AgentDB_Learning_Plugins_([""AgentDB Learning Plugins""])
    skill__AgentDB_Memory_Patterns_([""AgentDB Memory Patterns""])
    skill__AgentDB_Performance_Optimization_([""AgentDB Performance Optimization""])
    skill__AgentDB_Vector_Search_([""AgentDB Vector Search""])
    skills_more[["... +25 more skills"]]

    %% Styling
    classDef coordinator fill:#e1f5fe,stroke:#01579b,color:#01579b,stroke-width:3px
    classDef worker fill:#f3e5f5,stroke:#4a148c,color:#4a148c,stroke-width:2px
    classDef specialist fill:#e8f5e9,stroke:#1b5e20,color:#1b5e20,stroke-width:2px
    classDef reviewer fill:#fff3e0,stroke:#e65100,color:#e65100,stroke-width:2px
    classDef custom fill:#fce4ec,stroke:#880e4f,color:#880e4f,stroke-width:2px
    classDef input fill:#e8f5e9,stroke:#2e7d32,color:#2e7d32,stroke-width:2px
    classDef output fill:#ffebee,stroke:#c62828,color:#c62828,stroke-width:2px
    classDef hook fill:#fff8e1,stroke:#f57f17,color:#f57f17,stroke-width:2px,stroke-dasharray:5 5
    classDef mcp fill:#e0f2f1,stroke:#00695c,color:#00695c,stroke-width:2px
    classDef skill fill:#e3f2fd,stroke:#0d47a1,color:#0d47a1,stroke-width:2px,stroke-dasharray:5 5
    classDef subgraph_style fill:#fafafa,stroke:#9e9e9e,color:#424242,stroke-width:1px
    classDef more fill:#f5f5f5,stroke:#757575,stroke-dasharray:3 3,color:#757575
    classDef category fill:#fafafa,stroke:#9e9e9e,stroke-width:2px,color:#212121
    class _code_analyzer_ custom
    class analyst custom
    class _code_analyzer_ custom
    class _system_architect_ custom
    class _system_architect_ custom
    class browser_agent worker
    class byzantine_coordinator coordinator
    class crdt_synchronizer custom
    class gossip_coordinator coordinator
    class performance_benchmarker custom
    class quorum_manager coordinator
    class raft_manager coordinator
    class security_manager custom
    class coder custom
    class planner coordinator
    class researcher custom
    class reviewer custom
    class tester custom
    class test_long_runner worker
    class _ml_developer_ custom
    class _ml_developer_ custom
    class _backend_dev_ custom
    class _backend_dev_ custom
    class _cicd_engineer_ custom
    class _cicd_engineer_ custom
    class _api_docs_ custom
    class _api_docs_ custom
    class flow_nexus_app_store worker
    class flow_nexus_auth worker
    class flow_nexus_challenges worker
    class flow_nexus_neural worker
    class flow_nexus_payments worker
    class flow_nexus_sandbox worker
    class flow_nexus_swarm worker
    class flow_nexus_user_tools worker
    class flow_nexus_workflow worker
    class code_review_swarm custom
    class github_modes custom
    class issue_tracker custom
    class multi_repo_swarm custom
    class pr_manager custom
    class project_board_sync custom
    class release_manager custom
    class release_swarm custom
    class repo_architect custom
    class swarm_issue custom
    class swarm_pr custom
    class sync_coordinator custom
    class workflow_automation custom
    class sublinear_goal_planner worker
    class goal_planner worker
    class Benchmark_Suite custom
    class Load_Balancing_Coordinator custom
    class Performance_Monitor custom
    class Resource_Allocator custom
    class Topology_Optimizer custom
    class agentic_payments worker
    class sona_learning_optimizer custom
    class architecture custom
    class pseudocode custom
    class refinement custom
    class specification custom
    class _mobile_dev_ custom
    class _mobile_dev_ custom
    class consensus_coordinator coordinator
    class matrix_optimizer worker
    class pagerank_analyzer worker
    class performance_optimizer worker
    class trading_predictor worker
    class adaptive_coordinator coordinator
    class hierarchical_coordinator coordinator
    class mesh_coordinator coordinator
    class smart_agent custom
    class base_template_generator worker
    class swarm_init custom
    class pr_manager custom
    class sparc_coder custom
    class memory_coordinator custom
    class task_orchestrator custom
    class perf_analyzer custom
    class sparc_coord custom
    class production_validator custom
    class tdd_london_swarm custom
    class adr_architect custom
    class aidefence_guardian custom
    class claims_authorizer custom
    class collective_intelligence_coordinator coordinator
    class ddd_domain_expert custom
    class injection_analyst custom
    class memory_specialist specialist
    class performance_engineer custom
    class pii_detector custom
    class reasoningbank_learner specialist
    class security_architect_aidefence custom
    class security_architect custom
    class security_auditor custom
    class sparc_orchestrator coordinator
    class swarm_memory_manager coordinator
    class v3_integration_architect custom
    class skill__AgentDB_Advanced_Features_ skill
    class skill__AgentDB_Learning_Plugins_ skill
    class skill__AgentDB_Memory_Patterns_ skill
    class skill__AgentDB_Performance_Optimization_ skill
    class skill__AgentDB_Vector_Search_ skill
    class skill_browser skill
    class skill_github_code_review skill
    class skill_github_multi_repo skill
    class skill_github_project_management skill
    class skill_github_release_management skill
    class skill_github_workflow_automation skill
    class skill_Hooks_Automation skill
    class skill_Pair_Programming skill
    class skill__ReasoningBank_with_AgentDB_ skill
    class skill__ReasoningBank_Intelligence_ skill
    class skill__Skill_Builder_ skill
    class skill_sparc_methodology skill
    class skill_stream_chain skill
    class skill_swarm_advanced skill
    class skill__Swarm_Orchestration_ skill
    class skill__V3_CLI_Modernization_ skill
    class skill__V3_Core_Implementation_ skill
    class skill__V3_DDD_Architecture_ skill
    class skill__V3_Deep_Integration_ skill
    class skill__V3_MCP_Optimization_ skill
    class skill__V3_Memory_Unification_ skill
    class skill__V3_Performance_Optimization_ skill
    class skill__V3_Security_Overhaul_ skill
    class skill__V3_Swarm_Coordination_ skill
    class skill__Verification___Quality_Assurance_ skill
    class github_more more
    class other_more more
    class coordination_more more
    class flow_nexus_more more
    class security_more more
    class performance_more more
    class sparc_more more
    class development_more more
    class consensus_more more
    class v3_core_more more
    class testing_more more
    class analysis_more more
    class documentation_more more
    class memory_more more
    class skills_more more
```

---
*Generated by AgentScope on 2026-01-22 at 19:12:39.223Z*