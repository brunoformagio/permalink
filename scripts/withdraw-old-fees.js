const { ethers } = require("hardhat");

async function main() {
  console.log("💰 Withdrawing Accumulated Fees from Old Contract\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Withdrawing with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "XTZ\n");

  // Old contract address
  const oldContractAddress = "0x2d05A8C6bca808a6dEE8F664Da239EbACC713d00";
  const treasuryAddress = process.env.NEXT_PUBLIC_PLATFORM_TREASURY_ADDRESS || deployer.address;
  
  console.log("Old Contract:", oldContractAddress);
  console.log("Treasury Address:", treasuryAddress);

  // Get contract instance
  const Permalink = await ethers.getContractAt("Permalink", oldContractAddress);

  // Check current balance
  const contractBalance = await ethers.provider.getBalance(oldContractAddress);
  console.log("Contract Balance:", ethers.formatEther(contractBalance), "XTZ");

  if (contractBalance === 0n) {
    console.log("✅ No fees to withdraw - contract balance is zero");
    return;
  }

  console.log(`\n💸 Withdrawing ${ethers.formatEther(contractBalance)} XTZ to treasury...`);

  try {
    // Withdraw the accumulated platform fees
    const tx = await Permalink.withdrawPlatformFees();
    console.log("Transaction hash:", tx.hash);
    
    // Wait for confirmation
    console.log("⏳ Waiting for confirmation...");
    await tx.wait();
    
    console.log("✅ Fees withdrawn successfully!");
    
    // Verify the withdrawal
    const newContractBalance = await ethers.provider.getBalance(oldContractAddress);
    const treasuryBalance = await ethers.provider.getBalance(treasuryAddress);
    
    console.log("\n📊 After Withdrawal:");
    console.log("Contract Balance:", ethers.formatEther(newContractBalance), "XTZ");
    console.log("Treasury Balance:", ethers.formatEther(treasuryBalance), "XTZ");
    
    if (newContractBalance === 0n) {
      console.log("✅ All accumulated fees successfully withdrawn to treasury");
    } else {
      console.log("⚠️  Some balance remains in contract:", ethers.formatEther(newContractBalance), "XTZ");
    }

  } catch (error) {
    console.error("❌ Error withdrawing fees:", error.message);
    
    // Check if we're the owner
    try {
      const owner = await Permalink.owner();
      if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
        console.log("⚠️  You are not the contract owner. Owner is:", owner);
      }
    } catch (ownerError) {
      console.log("⚠️  Could not verify contract ownership");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 