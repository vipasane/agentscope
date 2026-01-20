```mermaid
graph TB
    %% Agent Architecture Component Map

    subgraph Agents["Agents"]
        _code_analyzer_["🤖 "code-analyzer"<br/><small>"Advanced code quality anal...</small>"]
        analyst["🤖 analyst<br/><small>"Advanced code quality anal...</small>"]
        _code_analyzer_["🤖 "code-analyzer"<br/><small>"Advanced code quality anal...</small>"]
        _system_architect_["🤖 "system-architect"<br/><small>"Expert agent for system ar...</small>"]
        _system_architect_["🤖 "system-architect"<br/><small>"Expert agent for system ar...</small>"]
        byzantine_coordinator["👑 byzantine-coordinator<br/><small>Coordinates Byzantine fault...</small>"]
        crdt_synchronizer["🤖 crdt-synchronizer<br/><small>Implements Conflict-free Re...</small>"]
        gossip_coordinator["👑 gossip-coordinator<br/><small>Coordinates gossip-based co...</small>"]
        performance_benchmarker["🤖 performance-benchmarker<br/><small>Implements comprehensive pe...</small>"]
        quorum_manager["👑 quorum-manager<br/><small>Implements dynamic quorum a...</small>"]
        raft_manager["👑 raft-manager<br/><small>Manages Raft consensus algo...</small>"]
        security_manager["🤖 security-manager<br/><small>Implements comprehensive se...</small>"]
        coder["🤖 coder<br/><small>Implementation specialist f...</small>"]
        planner["👑 planner<br/><small>Strategic planning and task...</small>"]
        researcher["🤖 researcher<br/><small>Deep research and informati...</small>"]
        reviewer["🤖 reviewer<br/><small>Code review and quality ass...</small>"]
        tester["🤖 tester<br/><small>Comprehensive testing and q...</small>"]
        test_long_runner["🤖 test-long-runner<br/><small>Test agent that can run for...</small>"]
        _ml_developer_["🤖 "ml-developer"<br/><small>"ML developer with self-lea...</small>"]
        _ml_developer_["🤖 "ml-developer"<br/><small>"Specialized agent for mach...</small>"]
        _backend_dev_["🤖 "backend-dev"<br/><small>"Specialized agent for back...</small>"]
        _backend_dev_["🤖 "backend-dev"<br/><small>"Specialized agent for back...</small>"]
        _cicd_engineer_["🤖 "cicd-engineer"<br/><small>"Specialized agent for GitH...</small>"]
        _cicd_engineer_["🤖 "cicd-engineer"<br/><small>"Specialized agent for GitH...</small>"]
        _api_docs_["🤖 "api-docs"<br/><small>"Expert agent for creating ...</small>"]
        _api_docs_["🤖 "api-docs"<br/><small>"Expert agent for creating ...</small>"]
        flow_nexus_app_store["🤖 flow-nexus-app-store<br/><small>Application marketplace and...</small>"]
        flow_nexus_auth["🤖 flow-nexus-auth<br/><small>Flow Nexus authentication a...</small>"]
        flow_nexus_challenges["🤖 flow-nexus-challenges<br/><small>Coding challenges and gamif...</small>"]
        flow_nexus_neural["🤖 flow-nexus-neural<br/><small>Neural network training and...</small>"]
        flow_nexus_payments["🤖 flow-nexus-payments<br/><small>Credit management and billi...</small>"]
        flow_nexus_sandbox["🤖 flow-nexus-sandbox<br/><small>E2B sandbox deployment and ...</small>"]
        flow_nexus_swarm["🤖 flow-nexus-swarm<br/><small>AI swarm orchestration and ...</small>"]
        flow_nexus_user_tools["🤖 flow-nexus-user-tools<br/><small>User management and system ...</small>"]
        flow_nexus_workflow["🤖 flow-nexus-workflow<br/><small>Event-driven workflow autom...</small>"]
        code_review_swarm["🤖 code-review-swarm<br/><small>Deploy specialized AI agent...</small>"]
        github_modes["🤖 github-modes<br/><small>Comprehensive GitHub integr...</small>"]
        issue_tracker["🤖 issue-tracker<br/><small>Intelligent issue managemen...</small>"]
        multi_repo_swarm["🤖 multi-repo-swarm<br/><small>Cross-repository swarm orch...</small>"]
        pr_manager["🤖 pr-manager<br/><small>Comprehensive pull request ...</small>"]
        project_board_sync["🤖 project-board-sync<br/><small>Synchronize AI swarms with ...</small>"]
        release_manager["🤖 release-manager<br/><small>Automated release coordinat...</small>"]
        release_swarm["🤖 release-swarm<br/><small>Orchestrate complex softwar...</small>"]
        repo_architect["🤖 repo-architect<br/><small>Repository structure optimi...</small>"]
        swarm_issue["🤖 swarm-issue<br/><small>GitHub issue-based swarm co...</small>"]
        swarm_pr["🤖 swarm-pr<br/><small>Pull request swarm manageme...</small>"]
        sync_coordinator["🤖 sync-coordinator<br/><small>Multi-repository synchroniz...</small>"]
        workflow_automation["🤖 workflow-automation<br/><small>GitHub Actions workflow aut...</small>"]
        sublinear_goal_planner["🤖 sublinear-goal-planner<br/><small>"Goal-Oriented Action Plann...</small>"]
        goal_planner["🤖 goal-planner<br/><small>"Goal-Oriented Action Plann...</small>"]
        Benchmark_Suite["🤖 Benchmark Suite<br/><small>Comprehensive performance b...</small>"]
        Load_Balancing_Coordinator["🤖 Load Balancing Coordinator<br/><small>Dynamic task distribution, ...</small>"]
        Performance_Monitor["🤖 Performance Monitor<br/><small>Real-time metrics collectio...</small>"]
        Resource_Allocator["🤖 Resource Allocator<br/><small>Adaptive resource allocatio...</small>"]
        Topology_Optimizer["🤖 Topology Optimizer<br/><small>Dynamic swarm topology reco...</small>"]
        agentic_payments["🤖 agentic-payments<br/><small>Multi-agent payment authori...</small>"]
        sona_learning_optimizer["🤖 sona-learning-optimizer<br/><small>SONA-powered self-optimizin...</small>"]
        architecture["🤖 architecture<br/><small>SPARC Architecture phase sp...</small>"]
        pseudocode["🤖 pseudocode<br/><small>SPARC Pseudocode phase spec...</small>"]
        refinement["🤖 refinement<br/><small>SPARC Refinement phase spec...</small>"]
        specification["🤖 specification<br/><small>SPARC Specification phase s...</small>"]
        _mobile_dev_["🤖 "mobile-dev"<br/><small>"Expert agent for React Nat...</small>"]
        _mobile_dev_["🤖 "mobile-dev"<br/><small>"Expert agent for React Nat...</small>"]
        consensus_coordinator["👑 consensus-coordinator<br/><small>Distributed consensus agent...</small>"]
        matrix_optimizer["🤖 matrix-optimizer<br/><small>Expert agent for matrix ana...</small>"]
        pagerank_analyzer["🤖 pagerank-analyzer<br/><small>Expert agent for graph anal...</small>"]
        performance_optimizer["🤖 performance-optimizer<br/><small>System performance optimiza...</small>"]
        trading_predictor["🤖 trading-predictor<br/><small>Advanced financial trading ...</small>"]
        adaptive_coordinator["👑 adaptive-coordinator<br/><small>Dynamic topology switching ...</small>"]
        hierarchical_coordinator["👑 hierarchical-coordinator<br/><small>Queen-led hierarchical swar...</small>"]
        mesh_coordinator["👑 mesh-coordinator<br/><small>Peer-to-peer mesh network s...</small>"]
        smart_agent["🤖 smart-agent<br/><small>Intelligent agent coordinat...</small>"]
        base_template_generator["🤖 base-template-generator<br/><small>Use this agent when you nee...</small>"]
        swarm_init["🤖 swarm-init<br/><small>Swarm initialization and to...</small>"]
        pr_manager["🤖 pr-manager<br/><small>Complete pull request lifec...</small>"]
        sparc_coder["🤖 sparc-coder<br/><small>Transform specifications in...</small>"]
        memory_coordinator["🤖 memory-coordinator<br/><small>Manage persistent memory ac...</small>"]
        task_orchestrator["🤖 task-orchestrator<br/><small>Central coordination agent ...</small>"]
        perf_analyzer["🤖 perf-analyzer<br/><small>Performance bottleneck anal...</small>"]
        sparc_coord["🤖 sparc-coord<br/><small>SPARC methodology orchestra...</small>"]
        production_validator["🤖 production-validator<br/><small>Production validation speci...</small>"]
        tdd_london_swarm["🤖 tdd-london-swarm<br/><small>TDD London School specialis...</small>"]
        adr_architect["🤖 adr-architect<br/><small>V3 Architecture Decision Re...</small>"]
        aidefence_guardian["🤖 aidefence-guardian<br/><small>AI Defense Guardian agent t...</small>"]
        claims_authorizer["🤖 claims-authorizer<br/><small>V3 Claims-based authorizati...</small>"]
        collective_intelligence_coordinator["👑 collective-intelligence-coordinator<br/><small>Hive-mind collective decisi...</small>"]
        ddd_domain_expert["🤖 ddd-domain-expert<br/><small>V3 Domain-Driven Design spe...</small>"]
        injection_analyst["🤖 injection-analyst<br/><small>Deep analysis specialist fo...</small>"]
        memory_specialist["🎯 memory-specialist<br/><small>V3 memory optimization spec...</small>"]
        performance_engineer["🤖 performance-engineer<br/><small>V3 Performance Engineering ...</small>"]
        pii_detector["🤖 pii-detector<br/><small>Specialized PII detection a...</small>"]
        reasoningbank_learner["🎯 reasoningbank-learner<br/><small>V3 ReasoningBank integratio...</small>"]
        security_architect_aidefence["🤖 security-architect-aidefence<br/><small>|</small>"]
        security_architect["🤖 security-architect<br/><small>V3 Security Architecture sp...</small>"]
        security_auditor["🤖 security-auditor<br/><small>Advanced security auditor w...</small>"]
        sparc_orchestrator["👑 sparc-orchestrator<br/><small>V3 SPARC methodology orches...</small>"]
        swarm_memory_manager["👑 swarm-memory-manager<br/><small>V3 distributed memory manag...</small>"]
        v3_integration_architect["🤖 v3-integration-architect<br/><small>V3 deep agentic-flow@alpha ...</small>"]
        Tier["🤖 Tier<br/><small>Handler</small>"]
        Cost["🤖 Cost<br/><small>Use Cases</small>"]
        Haiku["🤖 Haiku<br/><small>~500ms</small>"]
        Trigger["🤖 Trigger<br/><small>Worker</small>"]
        optimize["🤖 optimize<br/><small>Performance optimization</small>"]
        testgaps["🤖 testgaps<br/><small>Find missing test coverage</small>"]
        audit["🤖 audit<br/><small>Security analysis</small>"]
        document["🤖 document<br/><small>Update documentation</small>"]
        map["🤖 map<br/><small>Update codebase map</small>"]
        deepdive["🤖 deepdive<br/><small>Deep code analysis</small>"]
        Code["🤖 Code<br/><small>Task</small>"]
        Command["🤖 Command<br/><small>Subcommands</small>"]
        init["🤖 init<br/><small>4</small>"]
        swarm["🤖 swarm<br/><small>6</small>"]
        memory["🤖 memory<br/><small>11</small>"]
        mcp["🤖 mcp<br/><small>9</small>"]
        task["🤖 task<br/><small>6</small>"]
        session["🤖 session<br/><small>7</small>"]
        config["🤖 config<br/><small>7</small>"]
        status["🤖 status<br/><small>3</small>"]
        workflow["🤖 workflow<br/><small>6</small>"]
        hooks["🤖 hooks<br/><small>17</small>"]
        Command["🤖 Command<br/><small>Subcommands</small>"]
        daemon["🤖 daemon<br/><small>5</small>"]
        neural["🤖 neural<br/><small>5</small>"]
        security["🤖 security<br/><small>6</small>"]
        performance["🤖 performance<br/><small>5</small>"]
        providers["🤖 providers<br/><small>5</small>"]
        plugins["🤖 plugins<br/><small>5</small>"]
        deployment["🤖 deployment<br/><small>5</small>"]
        embeddings["🤖 embeddings<br/><small>4</small>"]
        claims["🤖 claims<br/><small>4</small>"]
        migrate["🤖 migrate<br/><small>5</small>"]
        doctor["🤖 doctor<br/><small>1</small>"]
        completions["🤖 completions<br/><small>4</small>"]
        Hook["🤖 Hook<br/><small>Description</small>"]
        route["🤖 route<br/><small>Route task to optimal agent</small>"]
        explain["🤖 explain<br/><small>Explain routing decision</small>"]
        pretrain["🤖 pretrain<br/><small>Bootstrap intelligence from...</small>"]
        metrics["🤖 metrics<br/><small>View learning metrics dashb...</small>"]
        transfer["🤖 transfer<br/><small>Transfer patterns via IPFS ...</small>"]
        list["🤖 list<br/><small>List all registered hooks</small>"]
        intelligence["🤖 intelligence<br/><small>RuVector intelligence system</small>"]
        worker["🤖 worker<br/><small>Background worker management</small>"]
        progress["🤖 progress<br/><small>Check V3 implementation pro...</small>"]
        statusline["🤖 statusline<br/><small>Generate dynamic statusline</small>"]
        Worker["🤖 Worker<br/><small>Priority</small>"]
        ultralearn["🤖 ultralearn<br/><small>normal</small>"]
        optimize["🤖 optimize<br/><small>high</small>"]
        consolidate["🤖 consolidate<br/><small>low</small>"]
        predict["🤖 predict<br/><small>normal</small>"]
        audit["🤖 audit<br/><small>critical</small>"]
        map["🤖 map<br/><small>normal</small>"]
        preload["🤖 preload<br/><small>low</small>"]
        deepdive["🤖 deepdive<br/><small>normal</small>"]
        document["🤖 document<br/><small>normal</small>"]
        refactor["🤖 refactor<br/><small>normal</small>"]
        benchmark["🤖 benchmark<br/><small>normal</small>"]
        testgaps["🤖 testgaps<br/><small>normal</small>"]
        Metric["🤖 Metric<br/><small>Target</small>"]
        Condition["🤖 Condition<br/><small>Action</small>"]
    end

    subgraph MCP["MCP Servers"]
        mcp_claude_flow["🟢 claude-flow"]
    end

    subgraph Skills["Skills"]
        skill__AgentDB_Advanced_Features_["⚡ "AgentDB Advanced Features""]
        skill__AgentDB_Learning_Plugins_["⚡ "AgentDB Learning Plugins""]
        skill__AgentDB_Memory_Patterns_["⚡ "AgentDB Memory Patterns""]
        skill__AgentDB_Performance_Optimization_["⚡ "AgentDB Performance Optimization""]
        skill__AgentDB_Vector_Search_["⚡ "AgentDB Vector Search""]
        skill_github_code_review["⚡ github-code-review"]
        skill_github_multi_repo["⚡ github-multi-repo"]
        skill_github_project_management["⚡ github-project-management"]
        skill_github_release_management["⚡ github-release-management"]
        skill_github_workflow_automation["⚡ github-workflow-automation"]
        skill_Hooks_Automation["⚡ Hooks Automation"]
        skill_Pair_Programming["⚡ Pair Programming"]
        skill__ReasoningBank_with_AgentDB_["⚡ "ReasoningBank with AgentDB""]
        skill__ReasoningBank_Intelligence_["⚡ "ReasoningBank Intelligence""]
        skill__Skill_Builder_["⚡ "Skill Builder""]
        skill_sparc_methodology["⚡ sparc-methodology"]
        skill_stream_chain["⚡ stream-chain"]
        skill_swarm_advanced["⚡ swarm-advanced"]
        skill__Swarm_Orchestration_["⚡ "Swarm Orchestration""]
        skill__V3_CLI_Modernization_["⚡ "V3 CLI Modernization""]
        skill__V3_Core_Implementation_["⚡ "V3 Core Implementation""]
        skill__V3_DDD_Architecture_["⚡ "V3 DDD Architecture""]
        skill__V3_Deep_Integration_["⚡ "V3 Deep Integration""]
        skill__V3_MCP_Optimization_["⚡ "V3 MCP Optimization""]
        skill__V3_Memory_Unification_["⚡ "V3 Memory Unification""]
        skill__V3_Performance_Optimization_["⚡ "V3 Performance Optimization""]
        skill__V3_Security_Overhaul_["⚡ "V3 Security Overhaul""]
        skill__V3_Swarm_Coordination_["⚡ "V3 Swarm Coordination""]
        skill__Verification___Quality_Assurance_["⚡ "Verification & Quality Assurance""]
    end

    %% Agent Relationships

    %% Styling
    classDef coordinator fill:#e1f5fe,stroke:#01579b
    classDef worker fill:#f3e5f5,stroke:#4a148c
    classDef reviewer fill:#fff3e0,stroke:#e65100
    classDef specialist fill:#e8f5e9,stroke:#1b5e20
    classDef disabled fill:#eeeeee,stroke:#9e9e9e,stroke-dasharray: 5 5
    classDef mcp fill:#fce4ec,stroke:#880e4f
    classDef skill fill:#e3f2fd,stroke:#0d47a1
    class _code_analyzer_ "analysis"
    class analyst code-analyzer
    class _code_analyzer_ "analysis"
    class _system_architect_ "architecture"
    class _system_architect_ "architecture"
    class byzantine_coordinator coordinator
    class crdt_synchronizer synchronizer
    class gossip_coordinator coordinator
    class performance_benchmarker analyst
    class quorum_manager coordinator
    class raft_manager coordinator
    class security_manager security
    class coder developer
    class planner coordinator
    class researcher analyst
    class reviewer validator
    class tester validator
    class test_long_runner worker
    class _ml_developer_ "data"
    class _ml_developer_ "data"
    class _backend_dev_ "development"
    class _backend_dev_ "development"
    class _cicd_engineer_ "devops"
    class _cicd_engineer_ "devops"
    class _api_docs_ "documentation"
    class _api_docs_ "documentation"
    class flow_nexus_app_store worker
    class flow_nexus_auth worker
    class flow_nexus_challenges worker
    class flow_nexus_neural worker
    class flow_nexus_payments worker
    class flow_nexus_sandbox worker
    class flow_nexus_swarm worker
    class flow_nexus_user_tools worker
    class flow_nexus_workflow worker
    class code_review_swarm development
    class github_modes development
    class issue_tracker development
    class multi_repo_swarm coordination
    class pr_manager development
    class project_board_sync coordination
    class release_manager development
    class release_swarm coordination
    class repo_architect architecture
    class swarm_issue coordination
    class swarm_pr development
    class sync_coordinator coordination
    class workflow_automation automation
    class sublinear_goal_planner worker
    class goal_planner worker
    class Benchmark_Suite agent
    class Load_Balancing_Coordinator agent
    class Performance_Monitor agent
    class Resource_Allocator agent
    class Topology_Optimizer agent
    class agentic_payments worker
    class sona_learning_optimizer adaptive-learning
    class architecture architect
    class pseudocode architect
    class refinement developer
    class specification analyst
    class _mobile_dev_ "specialized"
    class _mobile_dev_ "specialized"
    class consensus_coordinator coordinator
    class matrix_optimizer worker
    class pagerank_analyzer worker
    class performance_optimizer worker
    class trading_predictor worker
    class adaptive_coordinator coordinator
    class hierarchical_coordinator coordinator
    class mesh_coordinator coordinator
    class smart_agent automation
    class base_template_generator worker
    class swarm_init coordination
    class pr_manager development
    class sparc_coder development
    class memory_coordinator coordination
    class task_orchestrator orchestration
    class perf_analyzer analysis
    class sparc_coord coordination
    class production_validator validator
    class tdd_london_swarm tester
    class adr_architect architect
    class aidefence_guardian security
    class claims_authorizer security
    class collective_intelligence_coordinator coordinator
    class ddd_domain_expert architect
    class injection_analyst security
    class memory_specialist specialist
    class performance_engineer optimization
    class pii_detector security
    class reasoningbank_learner specialist
    class security_architect_aidefence security
    class security_architect security
    class security_auditor security
    class sparc_orchestrator coordinator
    class swarm_memory_manager coordinator
    class v3_integration_architect architect
    class Tier worker
    class Cost worker
    class Haiku worker
    class Trigger worker
    class optimize worker
    class testgaps worker
    class audit worker
    class document worker
    class map worker
    class deepdive worker
    class Code worker
    class Command worker
    class init worker
    class swarm worker
    class memory worker
    class mcp worker
    class task worker
    class session worker
    class config worker
    class status worker
    class workflow worker
    class hooks worker
    class Command worker
    class daemon worker
    class neural worker
    class security worker
    class performance worker
    class providers worker
    class plugins worker
    class deployment worker
    class embeddings worker
    class claims worker
    class migrate worker
    class doctor worker
    class completions worker
    class Hook worker
    class route worker
    class explain worker
    class pretrain worker
    class metrics worker
    class transfer worker
    class list worker
    class intelligence worker
    class worker worker
    class progress worker
    class statusline worker
    class Worker worker
    class ultralearn worker
    class optimize worker
    class consolidate worker
    class predict worker
    class audit worker
    class map worker
    class preload worker
    class deepdive worker
    class document worker
    class refactor worker
    class benchmark worker
    class testgaps worker
    class Metric worker
    class Condition worker
    class mcp_claude_flow mcp
    class skill__AgentDB_Advanced_Features_ skill
    class skill__AgentDB_Learning_Plugins_ skill
    class skill__AgentDB_Memory_Patterns_ skill
    class skill__AgentDB_Performance_Optimization_ skill
    class skill__AgentDB_Vector_Search_ skill
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
```