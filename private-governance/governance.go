package main

import (
	"encoding/json"
	"fmt"
	"log"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type SmartContract struct {
	contractapi.Contract
}

type WithdrawalRequest struct {
	ID          string   `json:"id"`
	UserAddress string   `json:"userAddress"`
	Amount      int      `json:"amount"`
	Status      string   `json:"status"`    // PENDING, APPROVED, REJECTED
	Approvals   []string `json:"approvals"` // List of bank nodes (MSPs) that approved it
}

func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	log.Println("CollebFed Governance Chaincode Initialized")
	return nil
}

func (s *SmartContract) CreateWithdrawalRequest(ctx contractapi.TransactionContextInterface, id string, userAddress string, amount int) error {
	exists, err := s.RequestExists(ctx, id)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("the withdrawal request %s already exists", id)
	}

	request := WithdrawalRequest{
		ID:          id,
		UserAddress: userAddress,
		Amount:      amount,
		Status:      "PENDING",
		Approvals:   []string{},
	}

	requestJSON, err := json.Marshal(request)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, requestJSON)
}

func (s *SmartContract) GetWithdrawalRequest(ctx contractapi.TransactionContextInterface, id string) (*WithdrawalRequest, error) {
	requestBytes, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if requestBytes == nil {
		return nil, fmt.Errorf("the withdrawal request %s does not exist", id)
	}

	var request WithdrawalRequest
	err = json.Unmarshal(requestBytes, &request)
	if err != nil {
		return nil, err
	}

	return &request, nil
}

func (s *SmartContract) ApproveWithdrawal(ctx contractapi.TransactionContextInterface, id string) error {
	clientMSPID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get client MSP ID: %v", err)
	}

	request, err := s.GetWithdrawalRequest(ctx, id)
	if err != nil {
		return err
	}

	if request.Status != "PENDING" {
		return fmt.Errorf("request %s is already %s", id, request.Status)
	}

	for _, approval := range request.Approvals {
		if approval == clientMSPID {
			return fmt.Errorf("MSP %s has already approved request %s", clientMSPID, id)
		}
	}

	// Governance Rule: Daily Limit
	if request.Amount > 50000 {
		request.Status = "REJECTED"
		requestJSON, _ := json.Marshal(request)
		return ctx.GetStub().PutState(id, requestJSON)
	}

	request.Approvals = append(request.Approvals, clientMSPID)

	// BFT Threshold (Set to 2 for local test-network)
	totalValidators := 2
	requiredThreshold := ((totalValidators * 2) / 3) + 1

	if len(request.Approvals) >= requiredThreshold {
		request.Status = "APPROVED"

		// Broadcast the event to the Listener
		requestJSON, err := json.Marshal(request)
		if err != nil {
			return err
		}
		err = ctx.GetStub().SetEvent("WithdrawalApproved", requestJSON)
		if err != nil {
			return err
		}
	}

	// Finalize and save state
	updatedRequestJSON, err := json.Marshal(request)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, updatedRequestJSON)
}

func (s *SmartContract) RequestExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	requestBytes, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}
	return requestBytes != nil, nil
}

func main() {
	governanceChaincode, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		log.Panicf("Error creating CollebFed governance chaincode: %v", err)
	}

	if err := governanceChaincode.Start(); err != nil {
		log.Panicf("Error starting CollebFed governance chaincode: %v", err)
	}
}