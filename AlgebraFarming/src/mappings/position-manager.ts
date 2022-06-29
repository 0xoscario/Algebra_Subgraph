import {
  IncreaseLiquidity,
  DecreaseLiquidity,
  Transfer
} from '../types/NonfungiblePositionManager/NonfungiblePositionManager'
import {  Deposit } from '../types/schema'
import { BigInt } from '@graphprotocol/graph-ts'
import { FarmingCenterAddress } from '../utils/constants'


export function handleIncreaseLiquidity(event: IncreaseLiquidity): void {
  let entity = Deposit.load(event.params.tokenId.toString());

  if (entity == null) {
    entity = new Deposit(event.params.tokenId.toString());
    entity.owner = event.transaction.from;
    entity.pool = event.params.pool;
    entity.onFarmingCenter = false;
    entity.liquidity = BigInt.fromString("0")
  }
  entity.liquidity = entity.liquidity.plus(event.params.liquidity);
  entity.save();

}

export function handleDecreaseLiquidity(event: DecreaseLiquidity): void{

  let deposit = Deposit.load(event.params.tokenId.toString());
  if (deposit){
    deposit.liquidity = deposit.liquidity.minus(event.params.liquidity)
    deposit.save()
  }
}


export function handleTransfer(event: Transfer): void {

  let entity = Deposit.load(event.params.tokenId.toString());
  
  if (entity != null) {
    entity.owner = event.params.to;
  
    if (event.params.to == FarmingCenterAddress){
      entity.onFarmingCenter = true
      entity.owner = event.params.from;
    }

    if (event.params.from == FarmingCenterAddress){
      entity.onFarmingCenter = false
    }
    entity.save(); 
  }
 
}
