from graphviz import Digraph

# Configuration for a professional IEEE publication aesthetic
dot = Digraph('FedCustody_Detailed_Arch', comment='Consensus-on-Consensus Architecture')
dot.attr(rankdir='LR', size='12,12', fontname='Helvetica', fontsize='12', splines='ortho')
dot.attr('node', fontname='Helvetica', fontsize='11', shape='rectangle', style='filled')
dot.attr('edge', fontname='Helvetica', fontsize='10')

# --- LAYER 1: PUBLIC BLOCKCHAIN (Ingress) ---
with dot.subgraph(name='cluster_public') as p:
    p.attr(label='PUBLIC BLOCKCHAIN LAYER\n(e.g., Polygon PoS)', style='filled', color='#e8f0fe', fontname='Helvetica-Bold')
    
    p.node('User', 'User / Beneficiary\n[requestWithdrawal]', shape='actor', fillcolor='white')
    p.node('Vault', 'FedVault Smart Contract\n(Solidity Artifacts)', fillcolor='white')
    
    # Visualizing the Block Confirmation Depth (k-depth) as seen in Fig 3
    p.node('KDepth', 'Block N (Finalized)\nConfirmed (k-depth)', shape='stackedbox', fillcolor='#d2e3fc')
    
    p.edge('User', 'Vault', label='1. Intent Submission')
    p.edge('Vault', 'KDepth', label='2. Event Emission')

# --- LAYER 2: BRIDGE MIDDLEWARE (Interoperability) ---
with dot.subgraph(name='cluster_bridge') as b:
    b.attr(label='BRIDGE MIDDLEWARE\n(Off-Chain Aggregation)', style='filled', color='#fff7e6', fontname='Helvetica-Bold')
    
    b.node('Relayer', 'Event Relayer Service\n(Go-Ethereum / Fabric-SDK)', fillcolor='white')
    b.node('BLS_Agg', 'BLS Aggregator Service\n(Collective Signing)', fillcolor='white', shape='component')
    
    b.edge('KDepth', 'Relayer', label='3. Observe & Verify')

# --- LAYER 3: PRIVATE FEDERATION (Governance) ---
with dot.subgraph(name='cluster_private') as g:
    g.attr(label='PRIVATE GOVERNANCE LAYER\n(Hyperledger Fabric v2.5)', style='filled', color='#f3e5f5', fontname='Helvetica-Bold')
    
    g.node('Orderer', 'Orderer Node\n(Raft Consensus)', shape='cylinder', fillcolor='white')
    
    # Representing the Ingestion Chaincode module as seen in Fig 3
    with g.subgraph(name='cluster_chaincode') as cc:
        cc.attr(label='Consensus-on-Consensus Logic', style='dashed', color='#7b1fa2')
        cc.node('Ingestion', 'Ingestion Chaincode\n(Proposal Aggregator)', fillcolor='white')
        cc.node('VW', 'Verification Weight\n(VW > 2/3 Threshold)', shape='circle', fillcolor='#e1bee7')
    
    # Representing the Validator Set
    g.node('P1', 'Validator P1\n(Policy Engine)', fillcolor='white')
    g.node('P2', 'Validator P2\n(Policy Engine)', fillcolor='white')
    g.node('P3', 'Validator P3\n(Policy Engine)', fillcolor='white')

    g.edge('Relayer', 'Orderer', label='4. EndorseProposal')
    g.edge('Orderer', 'Ingestion')
    g.edge('Ingestion', 'VW')
    g.edge('VW', 'P1')
    g.edge('VW', 'P2')
    g.edge('VW', 'P3')

# --- AUTHORIZATION LOOP (BLS AGGREGATION) ---
# Mapping the signature flow back to the public layer as seen in Fig 2
dot.edge('P1', 'BLS_Agg', label='5. Partial BLS Sig')
dot.edge('P2', 'BLS_Agg', label='5. Partial BLS Sig')
dot.edge('P3', 'BLS_Agg', label='5. Partial BLS Sig')

dot.edge('BLS_Agg', 'Vault', label='6. Submit Aggregated Proof\n(1x Pairing Check)', color='#1e88e5', penwidth='2.0')

# Render the professional diagram
dot.render('FedCustody_IEEE_Architecture', format='png', cleanup=True)
print("In-depth architecture generated: 'FedCustody_IEEE_Architecture.png'")