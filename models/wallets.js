var mongoose = require("mongoose");

var WalletSchema = new mongoose.Schema({
    uid : String,
    name: String,
    privateKey: String,
    address: String,
    mnemonic : String
    
});

module.exports = mongoose.model("Wallet",WalletSchema);