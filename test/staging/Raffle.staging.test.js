const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");

developmentChains.includes(network.name) ?
	describe.skip :
	describe("Raffle Staging Tests", async function() {
		let raffle, raffleEntranceFee, deployer, interval;

		beforeEach(async function() {
			deployer = (await getNamedAccounts()).deployer;
			raffle = await ethers.getContract("Raffle", deployer);
			raffleEntranceFee = await raffle.getEntranceFee();
			interval = await raffle.getInterval();
		})

		describe("fulfillRandomWords", async function() {
			it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async function() {
				// Enter the raffle
				const startingTimestamp = await raffle.getLastTimestamp()
				const accounts = await ethers.getSigners();

				// Setup the listener before we enter the raffle.
				// Just in case the blockchain moves really fast.
				await new Promise(async (resolve, reject) => {
					raffle.once("WinnerPicked", async function() {
						console.log("WinnerPicked event fired!");
						try {
							// add asserts here.
							const recentWinner = await raffle.getRecentWinner();
							const raffleState = await raffle.getRaffleState();
							const winnerEndingBalance = await accounts[0].getBalance();
							const endingTimestamp = await raffle.getLastTimestamp();

							await expect(raffle.getPlayer(0)).to.be.reverted;
							assert.equal(recentWinner.toString(), accounts[0].address);
							assert.equal(raffleState, 0);
							assert.equal(winnerEndingBalance.toString(), winnerStartingBalance.add(raffleEntranceFee).toString());
							assert(endingTimestamp > startingTimestamp);
							resolve();
						} catch (error) {
							console.log(error);
							reject(error);
						}
					})

					// Then entering the raffle.
					await raffle.enterRaffle({ value: raffleEntranceFee });
					const winnerStartingBalance = await accounts[0].getBalance();

					// and this code won't complete until the listener has finished listening.

				})
			})
		})
	})