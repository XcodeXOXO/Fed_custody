from graphviz import Digraph

# Configuration for a professional IEEE publication aesthetic
dot = Digraph('FedCustody_Final_Arch', comment='Hybrid Blockchain Architecture')
dot.attr(rankdir='TB', size='12,12', fontname='Helvetica', fontsize='12')
dot.attr('node', fontname='Helvetica', fontsize='11', shape='rectangle', style='filled')
dot.attr('edge', fontname='Helvetica', fontsize='10')

# --- 1. PUBLIC ASSET LAYER (Polygon/Hardhat) ---
with dot.subgraph(name='cluster_public') as p:
    p.attr(label='PUBLIC ASSET LAYER (Permissionless)\ne.g., Polygon PoS / Sepolia', 
           style='filled', color='#e8f0fe', fontname='Helvetica-Bold')
    
    p.node('User', 'User / Beneficiary\n[requestWithdrawal]', shape='actor', fillcolor='white')
    p.node('Vault', 'FedVault Smart Contract\n(Solidity / EVM)', fillcolor='white')
    p.node('Event', 'Event: WithdrawalRequested\n(Probabilistic Finality)', shape='cds', fillcolor='#d2e3fc')
    
    p.edge('User', 'Vault', label='1. Intent Submission')
    p.edge('Vault', 'Event', label='2. Event Emission')

# --- 2. BRIDGE MIDDLEWARE (Off-Chain) ---
with dot.subgraph(name='cluster_bridge') as b:
    b.attr(label='BRIDGE MIDDLEWARE (Go Services)', 
           style='filled', color='#fff7e6', fontname='Helvetica-Bold')
    
    b.node('Relayer', 'Event Relayer Agent\n(k-depth Verification)', fillcolor='white')
    b.node('Aggregator', 'BLS Aggregator Service\n(Signature Combination)', fillcolor='white', shape='component')
    
    b.edge('Event', 'Relayer', label='3. Observe & Verify')

# --- 3. PRIVATE GOVERNANCE LAYER (Hyperledger Fabric) ---
with dot.subgraph(name='cluster_private') as g:
    g.attr(label='PRIVATE GOVERNANCE LAYER (Permissioned)\nHyperledger Fabric v2.5 Consortium', 
           style='filled', color='#f3e5f5', fontname='Helvetica-Bold')
    
    g.node('Orderer', 'Orderer Node\n(Raft Consensus)', shape='cylinder', fillcolor='white')
    
    # Ingestion & Policy Modules
    with g.subgraph(name='cluster_logic') as l:
        l.attr(label='Chaincode Logic', style='dashed', color='#7b1fa2')
        l.node('Ingestion', 'Ingestion Contract\n(Consensus-on-Consensus)', fillcolor='white')
        l.node('Policy', 'Custody Policy Engine\n(AML & Velocity Limits)', fillcolor='white')
        
    # Validator Set (BFT Quorum)
    with g.subgraph(name='cluster_nodes') as n:
        n.attr(label='Validator Quorum (N >= 3f+1)', style='dotted')
        n.node('P1', 'Validator P1', fillcolor='white')
        n.node('P2', 'Validator P2', fillcolor='white')
        n.node('P3', 'Validator P3', fillcolor='white')

    g.edge('Relayer', 'Orderer', label='4. Submit Proposal')
    g.edge('Orderer', 'Ingestion', label='Total Ordering')
    g.edge('Ingestion', 'Policy', label='VW > 2/3 Threshold')
    g.edge('Policy', 'P1', label='Sign Request')
    g.edge('Policy', 'P2')
    g.edge('Policy', 'P3')

# --- 4. SETTLEMENT LOOP ---
dot.edge('P1', 'Aggregator', label='5. Partial BLS Sig')
dot.edge('P2', 'Aggregator')
dot.edge('P3', 'Aggregator')

dot.edge('Aggregator', 'Vault', label='6. Submit Succinct Proof\n(BLS Multi-Signature)', color='#1e88e5', penwidth='2.0')

# Render the professional diagram
dot.render('FedCustody_Architecture_v2', format='png', cleanup=True)
print("Final Architecture generated: 'FedCustody_Architecture_v2.png'")