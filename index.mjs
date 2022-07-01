//import the reach standard library
import { loadStdlib } from '@reach-sh/stdlib';
//import all the compilled version of indexedDB.mjs i.e indexedDB.main.js
import * as backend from './build/index.main.mjs';
//import ask to allow user to interact with the backend on the terminal
import {ask} from '@reach-sh/stdlib';


//determine the users role in the contract
if (process.argv.length < 3 || ['seller', 'buyer'].includes(process.argv[2]) == false) {
  console.log('Usage: reach run index [seller|buyer]');
  process.exit(0);
}


//set user's role based on user's input
const role = process.argv[2];
console.log(`Your role is ${role}`);


//get the set environment variable for example Algo the default/fallback is Algo
const stdlib = loadStdlib(process.env);
console.log(`The consensus network is ${stdlib.connector}.`);
//get the networks standard currency unit naming so that it can be dispaled on terminal
const suStr = stdlib.standardUnit;
//create helper arrow functions to parse and format the currency units to four decimal places
const toAU = (su) => stdlib.parseCurrency(su);
const toSU = (au) => stdlib.formatCurrency(au, 4);

const iBalance = toAU(1000);
//show user's balance in terminal
const showBalance = async (acc) => console.log(`Your balance is ${toSU(await stdlib.balanceOf(acc))} ${suStr}.`);

const commonInteract = (role) => ({
  reportCancellation: () => { console.log(`${role == 'buyer' ? 'You' : 'The buyer'} cancelled the order.`); },
  reportPayment: (payment) => { console.log(`${role == 'buyer' ? 'You' : 'The buyer'} paid ${toSU(payment)} ${suStr} to the contract.`) },
  reportTransfer: (payment) => { console.log(`The contract paid ${toSU(payment)} ${suStr} to ${role == 'seller' ? 'you' : 'the seller'}.`) }
});

//if user role is seller deploy the contract 
if (role === 'seller') {
  const sellerInteract = {
    ...commonInteract(role),
    price: toAU(5),
    wisdom: await ask.ask('Enter a wise phrase, or press Enter for default:', (s) => {
      let w = !s ? 'Build healthy communities.' : s;
      if (!s) { console.log(w); }
      return w;
    }),
    reportReady: async (price) => {
      console.log(`Your wisdom is for sale at ${toSU(price)} ${suStr}.`);
      console.log(`Contract info: ${JSON.stringify(await ctc.getInfo())}`);
    },
  };

  //create a new test account and initialiaze the account with 1000 units of the Network
  const acc = await stdlib.newTestAccount(iBalance);
  await showBalance(acc);
  const ctc = acc.contract(backend);
  await ctc.participants.Seller(sellerInteract);
  await showBalance(acc);

} else {
    //this is the buyers option, for the buyer attach to this contrac
    const buyerInteract = {
        ...commonInteract(role),
        confirmPurchase: async (price) => await ask.ask(`Do you want to purchase wisdom for ${toSU(price)} ${suStr}?`, ask.yesno),
        reportWisdom: (wisdom) => console.log(`Your new wisdom is "${wisdom}"`),
    };

    //create test account based on the predefined balance
    const acc = await stdlib.newTestAccount(iBalance);
    //ask user for contract
    const info = await ask.ask('Paste contract info:', (s) => JSON.parse(s));
    const ctc = acc.contract(backend, info);
    const price = await ctc.views.Main.price();
    console.log(`The price of wisdom is ${price[0] == 'None' ? '0' : toSU(price[1])} ${suStr}.`);
    await showBalance(acc);
    await ctc.p.Buyer(buyerInteract);
    await showBalance(acc);
};
//show that contract is now complete
ask.done();