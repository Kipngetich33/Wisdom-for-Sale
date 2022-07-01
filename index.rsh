//Declare reach version that the DaPP that this file will be run with
'reach 0.1';

//create a common Participant interface this interface will be inherited by other 
//interact interfaces i.e seller and buyer
const commonInteract = {
  reportCancellation: Fun([], Null),
  reportPayment: Fun([UInt], Null),
  reportTransfer: Fun([UInt], Null)
};


//create sellers Participant interface that inherits from the common participant interface
const sellerInteract = {
  ...commonInteract,
  price: UInt,
  wisdom: Bytes(128),
  reportReady: Fun([UInt], Null),
};

//create buyers Participant interface that inherits from the common participant interface
const buyerInteract = {
  ...commonInteract,
  reportWisdom: Fun([Bytes(128)], Null),
  confirmPurchase: Fun([UInt], Bool)
};

//export the main reach application 
export const main = Reach.App(() => {
  const S = Participant('Seller', sellerInteract);
  const B = Participant('Buyer', buyerInteract);
  const V = View('Main', { price: UInt });
  init();

  //run a sellers only local step
  S.only(() => { const price = declassify(interact.price); });
  S.publish(price);
  S.interact.reportReady(price);
  V.price.set(price);
  commit();

  //Run  a buyers only local step
  B.only(() => { const willBuy = declassify(interact.confirmPurchase(price)); });
  B.publish(willBuy);
  if (!willBuy) {
    commit();
    each([S, B], () => interact.reportCancellation());
    exit();
  } else {
    commit();
  }

  //pay the declassified price for the product i.e wisdom
  B.pay(price);
  each([S, B], () => interact.reportPayment(price));


  //commit the changes to the network
  commit();

  //this is the sellers only step once the buyers step is complete
  S.only(() => { const wisdom = declassify(interact.wisdom); });

  //publish the product to the network
  S.publish(wisdom);

  // transfer the paid amount from the contract to the sellers account
  // this step ensures that no funds are left in the contract
  transfer(price).to(S);

  // commit the changes to the network
  commit();

  //this si a step for both the seller and the buyer
  each([S, B], () => interact.reportTransfer(price));
    B.interact.reportWisdom(wisdom);
    exit();
});