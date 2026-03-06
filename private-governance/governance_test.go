package main

import (
	"testing"

	"github.com/hyperledger/fabric-chaincode-go/pkg/cid"
	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-chaincode-go/shimtest"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockContext allows us to fake the Client Identity (MSP ID)
type MockContext struct {
	contractapi.TransactionContextInterface
	mock.Mock
}

func (m *MockContext) GetStub() shim.ChaincodeStubInterface {
	return m.Called().Get(0).(shim.ChaincodeStubInterface)
}

func (m *MockContext) GetClientIdentity() cid.ClientIdentity {
	return m.Called().Get(0).(cid.ClientIdentity)
}

// MockIdentity allows us to return a specific MSP ID during the test
type MockIdentity struct {
	cid.ClientIdentity
	mock.Mock
}

func (m *MockIdentity) GetMSPID() (string, error) {
	args := m.Called()
	return args.String(0), args.Error(1)
}

func TestBFTThreshold(t *testing.T) {
	contract := new(SmartContract)
	stub := shimtest.NewMockStub("governance", nil)
	ctx := new(MockContext)
	id := new(MockIdentity)

	// Setup Mocks
	ctx.On("GetStub").Return(stub)
	ctx.On("GetClientIdentity").Return(id)

	// --- START THE MOCK TRANSACTION ---
	stub.MockTransactionStart("tx1")

	// 1. Create a Request
	reqID := "TX100"
	err := contract.CreateWithdrawalRequest(ctx, reqID, "0xUserAddress", 1000)
	assert.NoError(t, err)

	// 2. First Approval (Org1) - Status should stay PENDING
	id.On("GetMSPID").Return("Org1MSP", nil).Once()
	err = contract.ApproveWithdrawal(ctx, reqID)
	assert.NoError(t, err)

	req, _ := contract.GetWithdrawalRequest(ctx, reqID)
	assert.NotNil(t, req)
	assert.Equal(t, "PENDING", req.Status)

	// 3. Second Approval (Org2) - Status should stay PENDING
	id.On("GetMSPID").Return("Org2MSP", nil).Once()
	err = contract.ApproveWithdrawal(ctx, reqID)
	assert.NoError(t, err)
	
	req, _ = contract.GetWithdrawalRequest(ctx, reqID)
	assert.Equal(t, "PENDING", req.Status)

	// 4. Third Approval (Org3) - Threshold met! Status should be APPROVED
	id.On("GetMSPID").Return("Org3MSP", nil).Once()
	err = contract.ApproveWithdrawal(ctx, reqID)
	assert.NoError(t, err)

	req, _ = contract.GetWithdrawalRequest(ctx, reqID)
	assert.Equal(t, "APPROVED", req.Status)
	assert.Equal(t, 3, len(req.Approvals))

	// --- END THE MOCK TRANSACTION ---
	stub.MockTransactionEnd("tx1")
}