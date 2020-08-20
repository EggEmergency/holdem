const handRanker = require('./hand-ranker');

/**
 * Player class used in the game object. Links back to the user
 */
class Player{
  constructor(user){
    this.name = user.userName;
    this.uuid = user.socket.id;
    this.stack = 200; // user.buyInAmount

    this.smallBlind = false;
    this.bigBlind = false;
    this.hand = [];
    this.handRanker = new handRanker.HandRanker();

    // Player state
    this.folded = false;
    this.isAllIn = false;
    this.sittingOut = false;

    // Bet sizing and valid moves
    this.totalInvestment = 0;
    this.maxBet = 0;
    this.maxRaise = 0;
    this.amountToCall = 0;
    this.canCall = false;
    this.canCallIn = false;
    this.canRaise = false;
    this.canCheck = false; // might not be needed. Check is just calling 0.
    this.canFold = false;
    this.canAllIn = false;
  }

  draw_card(deck){
    var card = deck.pop();
    this.hand.push(card);
    this.handRanker.add_card(card);
  }

  win_chips(chipCount){
    this.stack += chipCount;
  }

  new_card(card){
    this.handRanker.add_card(card);
  }

  new_hand(){
    // Player hand reset
    this.hand.length = 0;
    this.handRanker.reset();

    // Player state reset
    this.folded = false;
    this.isAllIn = false;
    this.sittingOut = false;

    // Bet sizing reset
    this.totalInvestment = 0;
    this.maxBet = 0;
    this.maxRaise = 0;
    this.amountToCall = 0;
    this.canCall = false;
    this.canCallIn = false;
    this.canRaise = false;
    this.canFold = false;
    this.canAllIn = false;

    this.totalInvestment = 0;
  }

  place_blind(amount){
    if (amount >= this.stack){
      amount = this.stack;
      this.stack = 0;
      this.isAllIn = true;
    }
    else{
      this.stack -= amount;
    }
    this.totalBetInRound += amount;
    this.totalInvestment += amount;
    return amount;
  }

  disable_moves(){
    this.canCall = false;
    this.canCallIn = false;
    this.canRaise = false;
    this.canFold = false;
    this.canAllIn = false;
  }

  /**
   * valid_moves
   * Input:
   *  totalCall - The greatest total investment of one player. I.e. player A bets 10, player B
   *    raises another 10 (puts in 20 chips), the total investment is 20. This is the totalCall
   *
   *  minRaise - The minimum which someone is allowed to raise. If what you are calling is less
   *    than the minimum raise, it means we saw a call-in.
   *
   *  blindPlayer - A boolean which is true if the player is a big blind or small blind, and 
   *    this is their first time acting. Under such circumstances, it looks like they are facing
   *    a bet which is not a min-raise, but this is false. The player can still act.
   *
   * 1) Our stack is less than the amount to call
   * We can 
   *   call-in
   *   fold
   * 
   * 2) Our stack is less than the minimum raise amount (but more than the call amount)
   * We can
   *   call
   *   call-in
   *   fold
   * 
   * 3) Our stack is greater than the minimum raise amount
   * We can
   *   call
   *   all-in
   *   fold
   *   raise
   * 
   * Special cases:
   * 1) The amount to call is 0 and we are acting:
   * This means that we are probably opening the action. So we are checking. We should never be
   * in a position where we are looking to raise ourselves.
   * 
   * 2) The amount to call is less than the minRaise:
   * Somebody else performed an all-in that wasn't large enough for us to re-raise. We can only call
   * or fold here. However, our call might be a call-in due to our stack size. OR WE ARE THE BLIND
   *
   */
  valid_moves(totalCall, minRaise, blindException = false){
    this.amountToCall = totalCall - this.totalInvestment;
    this.minRaiseTotal = this.amountToCall + minRaise;

    this.disable_moves();

    // Case 1)
    if (this.stack <= this.amountToCall){
      this.canCallIn = true;
      this.canFold = true;
    }

    // Case 2)
    else if (this.stack <= this.minRaiseTotal){
      this.canCall = true;
      this.canCallIn = true;
      this.canFold = true;
    }

    // Case 3)
    else{
      this.canCall = true;
      this.canAllIn = true;
      this.canFold = true;
      this.canRaise = true;
      this.maxRaise = this.stack;
    }

    // Special case 1)
    if (this.amountToCall === 0){
      this.canFold = false;
    }

    // Special case 2)
    else if (this.amountToCall < minRaise && blindException === false){
      this.canAllIn = false;
      this.canRaise = false;
      if (this.canCall === true){
        this.canCallIn = false;
      }
    }
  }

  place_bet(amount){
    if (amount > this.stack){
      console.log("Invalid move, bet amount above stack");
    }
    this.totalBetInRound += amount;
    this.totalInvestment += amount;
    this.stack -= amount;
    if (this.stack == 0){
      this.isAllIn = true;
    }
  }

  call(){
    if (this.canCall === false){
      console.log("Invalid move, cannot call?");
      return false;
    }
    this.place_bet(this.amountToCall);
    return this.amountToCall;
  }

  raise(amount){
    if (this.canRaise === false || amount > this.maxRaise || amount < this.minRaiseTotal){
      console.log("Invalid raise amount");
      return false
    }
    this.place_bet(amount);
    return amount;
  }

  all_in(){
    if (this.canCallIn === false && this.canAllIn === false){
      console.log("Cannot all in here");
      return false;
    }
    this.isAllIn = true;

    var betAmount = this.stack;
    this.place_bet(betAmount);
    return betAmount;
  }

  fold(){
    if (this.canFold === false){
      return false;
    }
    this.folded = true;
  }
}

module.exports = {
  Player,
};
