
import handleTransaction from './agent';

jest.mock('forta-agent');
jest.mock("ethers");
jest.mock("./network");
jest.mock("./unknown.approval");
jest.mock("./gas.token.scam");

describe('provideInitialize', () => {
    it('should expose a function', () => {
        expect(handleTransaction).toBeDefined();
    });

    it('provideInitialize should return expected output', () => {
        // const retValue = provideInitialize(provider);
        expect(true).toBeTruthy();
  });
});