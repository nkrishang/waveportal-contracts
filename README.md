# Buidlspace: WavePortal.

`WavePortal.sol` is the smart contract for Buildspace's Solidity course. To learn more, visit the [course page](https://buildspace.so/solidity).

## Deployments

### Rinkeby

`WavePortal.sol`: [0xd98840ecb01bdF2520B3418F2409709b6336b579](https://rinkeby.etherscan.io/address/0xd98840ecb01bdF2520B3418F2409709b6336b579#code)

## Run locally

Clone this reposiory

```bash
git clone https://github.com/nkrishang/waveportal-contracts.git
```

Install all dependencies

```bash
yarn install
```

Create an `.env` file following the `.env.example` file as a reference.

Compile the contracts in the `/contracts` directory by running

```bash
npx hardhat compile
```

Run tests with the following command

```bash
npx hardhat test
```

## Deploy the contracts

To deploy the contrats to a given network (e.g. rinkeby): 
- Update the `hardhat.config.js` file with the network's chain ID (rinkeby: 4)

```javascript
const chainIds = {
  rinkeby: 4,
};
```

- Append the network to the config file

```javascript
if (testPrivateKey) {
  config.networks = {
    rinkeby: createNetworkConfig("rinkeby"),
  };
}
```
- Finally, run the following command:

```bash
npx hardhat run scripts/deploy.js --network rinkeby
```

To verify the deployed contract on [Etherscan](https://etherscan.io/), run:

```bash
npx hardhat verify --network rinkeby contract-address
```

## Author

[@nkrishang](https://github.com/nkrishang)