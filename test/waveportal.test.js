const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Testing: WavePortal.sol", function() {

  // Signers
  let deployer;
  let waver;

  // Contract
  let wavePortal;

  // Other parameters
  const initialFund = ethers.utils.parseEther("10");
  const message = "hello"

  /**
   * To test 100% of our smart contract code, we must test `distributePrize`
   * when 1) a waver wins a prize, and 2) when a waver doesn't.
   * 
   * Whether a waver wins a prize or not depends on the value of the
   * random number generated in the body of `distributePrize`.
   * 
   * The random number is generated using block variables - block.timestamp and
   * block.dificulty - values of the block in which the wave transaction is mined.
   * 
   * The following helper functions let us travel to the block right before a
   * 'winning' or 'losing' block, letting a wave transaction get mined in the
   * intended kind of block.
   * 
   * The waver wins the prize if the wave transaction is executed in the winning block.
   * The waver does not win the prize if the wave transaction is executed in the losing block.
  **/
  const travelToWinningBlock = async () => {
    
    let winningBlock = false;

    let snapshotOfPrevBlock = await ethers.provider.send("evm_snapshot")
    await ethers.provider.send("evm_mine");

    while(!winningBlock) {
      const blockNumber = await ethers.provider.getBlockNumber();
      const { timestamp, difficulty } = await ethers.provider.getBlock(blockNumber);

      const randomNumber = (difficulty + timestamp) % 100;

      if(randomNumber < 50) {
        winningBlock = true;
        await ethers.provider.send("evm_revert", [snapshotOfPrevBlock]);

      } else {
        snapshotOfPrevBlock = await ethers.provider.send("evm_snapshot");
        await ethers.provider.send("evm_mine");
      }
    }
  }

  const travelToLosingBlock = async (winner) => {
    
    let losingBlock = false;

    let snapshotOfPrevBlock = await ethers.provider.send("evm_snapshot")
    await ethers.provider.send("evm_mine");

    while(!losingBlock) {
      const blockNumber = await ethers.provider.getBlockNumber();
      const { timestamp, difficulty } = await ethers.provider.getBlock(blockNumber);

      const randomNumber = (difficulty + timestamp) % 100;

      if(randomNumber < 50) {
        snapshotOfPrevBlock = await ethers.provider.send("evm_snapshot");
        await ethers.provider.send("evm_mine");

      } else {
        losingBlock = true;
        await ethers.provider.send("evm_revert", [snapshotOfPrevBlock]);
      }
    }
  }


  beforeEach(async () => {

    // Get signers
    [deployer, waver] = await ethers.getSigners();

    // Get contract
    const WavePortal_Factory = await ethers.getContractFactory("WavePortal");
    wavePortal = await WavePortal_Factory.deploy({ value: initialFund });
  })

  it("Should initialize contract with deployer as `me` and `prizeAmount` as 0.05 ether", async () => {
    expect(await wavePortal.me()).to.equal(deployer.address)
    expect(await wavePortal.prizeAmount()).to.equal(ethers.utils.parseEther("0.05"))
  })

  it("Should emit `NewWave` with the right values when someone waves", async () => {
    // Get the expected timestamp of the wave.
    const blockNumber = await ethers.provider.getBlockNumber();
    const { timestamp } = await ethers.provider.getBlock(blockNumber);
    const expectedTimestamp = timestamp + 1;

    expect(await wavePortal.connect(waver).waveAtMe(message))
      .to.emit(wavePortal, "NewWave")
      .withArgs(waver.address, expectedTimestamp, message);
  })

  it("Should emit `PrizeWon` on the waver winning the prize", async () => {        

    // Get the prize amount
    const prizeAmount = await wavePortal.prizeAmount();

    // Travel to winning block
    await travelToWinningBlock();

    expect(await wavePortal.connect(waver).waveAtMe(message))
      .to.emit(wavePortal, "PrizeWon")
      .withArgs(waver.address, prizeAmount)
  })

  it("Should update the contract's state variable appropriately upon a wave", async () => {
    // Wave
    await wavePortal.connect(waver).waveAtMe(message)
    const blockNumber = await ethers.provider.getBlockNumber();
    const { timestamp } = await ethers.provider.getBlock(blockNumber);

    // Should update the waver's total number of waves
    expect(await wavePortal.numOfWaves(waver.address)).to.equal(1);
    
    // Should update the waver's timestamp of last wave.
    expect(await wavePortal.lastWavedAt(waver.address)).to.equal(timestamp);
  })

  it("Should not let waver wave more than once within 15 minutes", async () => {
    // First wave
    await wavePortal.connect(waver).waveAtMe(message)

    // Get the first wave's timestamp
    const blockNumber = await ethers.provider.getBlockNumber();
    const { timestamp } = await ethers.provider.getBlock(blockNumber);

    // Second wave -- reverts since 15 minutes haven't passed
    await expect(wavePortal.connect(waver).waveAtMe(message))
      .to.be.revertedWith("Must wait 15 minutes before waving again.")
    
    // Third wave -- successful since 15 minutes+ have passed.

    const validNextTimestamp = timestamp + (15*60) + 1; // First wave's timestamp + 15 minutes and 1 second.
    await ethers.provider.send("evm_setNextBlockTimestamp", [validNextTimestamp])

    expect(await wavePortal.connect(waver).waveAtMe(message))
      .to.emit(wavePortal, "NewWave")
      .withArgs(waver.address, validNextTimestamp, message);
  })

  it("Should update the contracts' and waver's balance if the waver wins the prize", async () => {
    // Get the prize amount
    const prizeAmount = await wavePortal.prizeAmount();

    // balance before winning prize
    const waverBalBefore = await waver.getBalance();
    const wavePortalBalBefore = await ethers.provider.getBalance(wavePortal.address)

    // Travel to winning block -> wave and win prize.
    await travelToWinningBlock()
    await wavePortal.connect(waver).waveAtMe(message, {gasPrice: 0})

    // balance after winning prize
    const waverBalAfter = await waver.getBalance()
    const wavePortalBalAfter = await ethers.provider.getBalance(wavePortal.address)

    expect(waverBalAfter.sub(waverBalBefore)).to.equal(prizeAmount)
    expect(wavePortalBalBefore.sub(wavePortalBalAfter)).to.equal(prizeAmount)
  })

  it("Should not update the contracts' and waver's balance if the waver does not win the prize", async () => {
    // balance before winning prize
    const waverBalBefore = await waver.getBalance();
    const wavePortalBalBefore = await ethers.provider.getBalance(wavePortal.address)

    // Travel to winning block -> wave and win prize.
    await travelToLosingBlock()
    await wavePortal.connect(waver).waveAtMe(message, {gasPrice: 0})

    // balance after winning prize
    const waverBalAfter = await waver.getBalance()
    const wavePortalBalAfter = await ethers.provider.getBalance(wavePortal.address)

    expect(waverBalAfter).to.equal(waverBalBefore)
    expect(wavePortalBalAfter).to.equal(wavePortalBalBefore)
  })

  it("Should let only the deployer of the contract withdraw funds", async () => {
    const amountToWithdraw = ethers.utils.parseEther("1");

    // Should not let someone other than the deployer withdraw funds
    await expect(wavePortal.connect(waver).withdrawFunds(amountToWithdraw))
      .to.be.revertedWith("Not authorized to withdraw money from the contract")

    // Should let the deployer withdraw funds
    const balBefore = await deployer.getBalance()
    await wavePortal.connect(deployer).withdrawFunds(amountToWithdraw, {gasPrice: 0});
    const balAfter = await deployer.getBalance()

    expect(balAfter.sub(balBefore)).to.equal(amountToWithdraw)
  })
})