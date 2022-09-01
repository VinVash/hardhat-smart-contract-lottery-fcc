const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name) ?
	describe.skip :
	describe("Raffle Unit Tests", async function() {
		let raffle, vrfCoordinatorV2Mock, interval, raffleEntranceFee, deployer;
		const chainId = network.config.chainId;

		beforeEach(async function() {
			deployer = (await getNamedAccounts()).deployer;
			await deployments.fixture(["all"]);
			raffle = await ethers.getContract("Raffle", deployer); // connect with the deployer.
			vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer); // connect with the deployer.
			interval = await raffle.getInterval();
			raffleEntranceFee = await raffle.getEntranceFee();
		})

		describe("constructor", async function() {
			it("Initialises the raffle correctly", async function() {
				// Ideally we make our tests have just 1 assert per "it"
				const raffleState = await raffle.getRaffleState();
				assert.equal(raffleState.toString(), "0");
				assert.equal(interval.toString(), networkConfig[chainId]["interval"]);
			})
		})

		describe("enterRaffle", async function() {
			it("reverts when you don't pay enough", async function() {
				await expect(raffle.enterRaffle()).to.be.revertedWith("Raffle__NotEnoughETHEntered");
			})

			it("records players when they enter", async function() {
				await raffle.enterRaffle({ value: raffleEntranceFee });
				const playerFromContract = await raffle.getPlayer(0);
				assert.equal(playerFromContract, deployer);
			})

			it("emits event on enter", async function() {
				await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(raffle, "RaffleEnter");
			})

			it("doesn't allow entrance when raffle is calculating", async function() {
				await raffle.enterRaffle({ value: raffleEntranceFee });

				await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
				await network.provider.send("evm_mine", []); // just mine one block, therefore empty array.

				// We pretend to be a Chainlink keeper.
				await raffle.performUpkeep([]);
				await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith("Raffle__NotOpen");
			})
		})

		describe("checkUpkeep", async function() {
			it("returns false if people haven't sent any ETH", async function() {
				await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
				await network.provider.send("evm_mine", []);

				const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
				assert(!upkeepNeeded);
			})

			it("returns false if raffle isn't open", async function() {
				await raffle.enterRaffle({ value: raffleEntranceFee });
				await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
				await network.provider.send("evm_mine", []);
				await raffle.performUpkeep([]);
				const raffleState = await raffle.getRaffleState();
				const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
				assert.equal(raffleState.toString(), "1");
				assert.equal(upkeepNeeded, false);
			})

			it("returns false if enough time isn't passed", async function() {
				await raffle.enterRaffle({ value: raffleEntranceFee });
				await network.provider.send("evm_increaseTime", [interval.toNumber() - 1]);
				await network.provider.send("evm_mine", []);

				const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
				assert(!upkeepNeeded);
			})

			it("returns true if enough time has passed, has players, eth, and is open", async function() {
				await raffle.enterRaffle({ value: raffleEntranceFee });
				await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
				await network.provider.send("evm_mine", []);				

				const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
				assert(upkeepNeeded);	
			})
		})

		describe("performUpkeep", async function() {
			it("it can only run if checkUpkeep is true", async function() {
				await raffle.enterRaffle({ value: raffleEntranceFee });
				await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
				await network.provider.send("evm_mine", []);
				const tx = await raffle.performUpkeep([]);
				assert(tx);
			})

			it("reverts when checkUpkeep is false", async function() {
				await expect(raffle.performUpkeep([])).to.be.revertedWith("Raffle__UpkeepNotNeeded");
			})

			it("updates the raffle state, emits an event, and calls the vrf coordinator", async function() {
				await raffle.enterRaffle({ value: raffleEntranceFee });
				await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
				await network.provider.send("evm_mine", []);
				const txResponse = await raffle.performUpkeep([]);
				const txReceipt = await txResponse.wait(1);
				const requestId = txReceipt.events[1].args.requestId;
				const raffleState = await raffle.getRaffleState();
				assert(requestId.toNumber() > 0);
				assert(raffleState.toString() == "1")
			})
		})

		describe("fulfillRandomWords", async function() {
			beforeEach(async function() {
				await raffle.enterRaffle({ value: raffleEntranceFee });
				await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
				await network.provider.send("evm_mine", []);
			})

			it("can only be called after performUpkeep", async function() {
				await expect(vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)).to.be.revertedWith("nonexistent request");
				await expect(vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)).to.be.revertedWith("nonexistent request");
			})

			it("picks a winner, resets the lottery, and sends money", async function() {
				const additionalEntrants = 3;
				const startingAccountIndex = 1; // since deployer is index 0.
				const accounts = await ethers.getSigners();

				for(let i = startingAccountIndex; i < startingAccountIndex + additionalEntrants; i++) {
					const accountConnectedRaffle = raffle.connect(accounts[i]);
					await accountConnectedRaffle.enterRaffle({ value: raffleEntranceFee });
				}

				const startingTimestamp = await raffle.getLastTimestamp();

				// performUpkeep (mock being Chainlink keepers)
				// fulfillRandomWords (mock being Chainlink VRF)
				// We will have to wait for the fulfillRandomWords to be called

				// Set up a listener, and to prevent the test to finish before the listener has done listening,
				// we need to set up a promise.

				await new Promise(async (resolve, reject) => {
					raffle.once("WinnerPicked", async () => {
						console.log("Found the event!");
						try {
							const recentWinner = await raffle.getRecentWinner();
							const raffleState = await raffle.getRaffleState();
							const endingTimestamp = await raffle.getLastTimestamp();
							const numPlayers = await raffle.getNumberOfPlayers();
							const winnerEndingBalance = await accounts[1].getBalance();

							assert.equal(numPlayers.toString(), "0");
							assert.equal(raffleState.toString(), "0");
							assert(endingTimestamp > startingTimestamp);

							assert.equal(winnerEndingBalance.toString(), winnerStartingBalance.add(raffleEntranceFee.mul(additionalEntrants).add(raffleEntranceFee).toString()))
						} catch (e) {
							reject(e);
						}

						resolve();
					})

					// Setting up the listener.
					// below, we will fire the event, and the listener will pick it up, and resolve

					const tx = await raffle.performUpkeep([]);
					const txReceipt = await tx.wait(1);
					const winnerStartingBalance = await accounts[1].getBalance();
					await vrfCoordinatorV2Mock.fulfillRandomWords(txReceipt.events[1].args.requestId, raffle.address);
				})
			})
		})
	})