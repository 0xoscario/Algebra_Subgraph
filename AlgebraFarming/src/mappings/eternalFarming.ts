import { ethereum, Address, crypto, store, BigInt } from '@graphprotocol/graph-ts';
import {
  IncentiveCreated,
  FarmStarted,
  FarmEnded,
  RewardClaimed,
  IncentiveDetached,
  IncentiveAttached,
  RewardsRatesChanged,
  RewardsAdded,
  RewardsCollected
} from '../types/EternalFarming/EternalFarming';
import { Deposit, Reward, EternalFarming } from '../types/schema';
import { createTokenEntity } from '../utils/token'

export function handleIncentiveCreated(event: IncentiveCreated): void {
  let incentiveIdTuple: Array<ethereum.Value> = [
    ethereum.Value.fromAddress(event.params.rewardToken),
    ethereum.Value.fromAddress(event.params.bonusRewardToken),
    ethereum.Value.fromAddress(event.params.pool),
    ethereum.Value.fromUnsignedBigInt(event.params.startTime),
    ethereum.Value.fromUnsignedBigInt(event.params.endTime)
  ];

  createTokenEntity(event.params.rewardToken)
  createTokenEntity(event.params.bonusRewardToken)
  
  let _incentiveTuple = changetype<ethereum.Tuple>(incentiveIdTuple);

  let incentiveIdEncoded = ethereum.encode(
    ethereum.Value.fromTuple(_incentiveTuple)
  )!;
  let incentiveId = crypto.keccak256(incentiveIdEncoded);

  let entity = EternalFarming.load(incentiveId.toHex()); 
  if (entity == null) {
    entity = new EternalFarming(incentiveId.toHex());
    entity.reward = BigInt.fromString("0");
    entity.bonusReward = BigInt.fromString("0");
  }
  

  entity.rewardToken = event.params.rewardToken;
  entity.bonusRewardToken = event.params.bonusRewardToken;
  entity.pool = event.params.pool;
  entity.virtualPool = event.params.virtualPool;
  entity.startTime = event.params.startTime;
  entity.endTime = event.params.endTime;
  entity.isDetached = false;
  entity.tokenAmountForLevel1 = event.params.levels.tokenAmountForLevel1;
  entity.tokenAmountForLevel2 = event.params.levels.tokenAmountForLevel2;
  entity.tokenAmountForLevel3 = event.params.levels.tokenAmountForLevel3;
  entity.level1multiplier = event.params.levels.level1multiplier;
  entity.level2multiplier = event.params.levels.level2multiplier;
  entity.level3multiplier = event.params.levels.level3multiplier;
  entity.multiplierToken = event.params.multiplierToken;
  entity.save();
}


export function handleTokenStaked(event: FarmStarted): void {
  let entity = Deposit.load(event.params.tokenId.toString());
  if (entity != null) {
    entity.eternalFarming = event.params.incentiveId;
    entity.enteredInEternalFarming = event.block.timestamp;
    entity.tokensLockedEternal = event.params.tokensLocked;
    entity.levelEternal = getLevel(event.params.tokensLocked, event.params.incentiveId.toHexString())
    entity.save();
  }

}

export function handleRewardClaimed(event: RewardClaimed): void {
  let id = event.params.rewardAddress.toHexString() + event.params.owner.toHexString();
  let rewardEntity = Reward.load(id);
  if (rewardEntity != null){
      rewardEntity.owner = event.params.owner;
      rewardEntity.rewardAddress = event.params.rewardAddress;
      rewardEntity.amount = rewardEntity.amount.minus(event.params.reward);
      rewardEntity.save();
  }
}

export function handleTokenUnstaked(event: FarmEnded): void {
  
  let entity = Deposit.load(event.params.tokenId.toString());
  
  if(entity){
    let eternalFarming = EternalFarming.load(entity.eternalFarming! .toHexString())

    if(eternalFarming){
      eternalFarming.reward -= event.params.reward
      eternalFarming.bonusReward -= event.params.bonusReward
      eternalFarming.save()
    }
  }

  if (entity != null) {
    entity.eternalFarming = null;  
    entity.levelEternal = BigInt.fromString("0")
    entity.tokensLockedEternal = BigInt.fromString("0")
    entity.save();
  }

  let id = event.params.rewardAddress.toHexString() + event.params.owner.toHexString()
  let rewardEntity = Reward.load(id)

  if (rewardEntity == null){
      rewardEntity = new Reward(id)
      rewardEntity.amount = BigInt.fromString('0')
  }

  rewardEntity.owner = event.params.owner
  rewardEntity.rewardAddress = event.params.rewardAddress
  rewardEntity.amount = rewardEntity.amount.plus(event.params.reward)
  rewardEntity.save();  


  id =  event.params.bonusRewardToken.toHexString() + event.params.owner.toHexString()
  rewardEntity = Reward.load(id)

  if (rewardEntity == null){
    rewardEntity = new Reward(id)
    rewardEntity.amount = BigInt.fromString('0')
  }

  rewardEntity.owner = event.params.owner
  rewardEntity.rewardAddress = event.params.bonusRewardToken
  rewardEntity.amount = rewardEntity.amount.plus(event.params.bonusReward)
  rewardEntity.save();

}

export function handleDetached( event: IncentiveDetached): void{

  let incentiveIdTuple: Array<ethereum.Value> = [
    ethereum.Value.fromAddress(event.params.rewardToken),
    ethereum.Value.fromAddress(event.params.bonusRewardToken),
    ethereum.Value.fromAddress(event.params.pool),
    ethereum.Value.fromUnsignedBigInt(event.params.startTime),
    ethereum.Value.fromUnsignedBigInt(event.params.endTime)
  ];

  let _incentiveTuple = changetype<ethereum.Tuple>(incentiveIdTuple);

  let incentiveIdEncoded = ethereum.encode(
    ethereum.Value.fromTuple(_incentiveTuple)
  )!;
  let incentiveId = crypto.keccak256(incentiveIdEncoded);

  let entity = EternalFarming.load(incentiveId.toHex());

  if(entity){
    entity.isDetached = true
    entity.save()
  } 

}

export function handleAttached( event: IncentiveAttached): void{

  let incentiveIdTuple: Array<ethereum.Value> = [
    ethereum.Value.fromAddress(event.params.rewardToken),
    ethereum.Value.fromAddress(event.params.bonusRewardToken),
    ethereum.Value.fromAddress(event.params.pool),
    ethereum.Value.fromUnsignedBigInt(event.params.startTime),
    ethereum.Value.fromUnsignedBigInt(event.params.endTime)
  ];

  let _incentiveTuple = changetype<ethereum.Tuple>(incentiveIdTuple);

  let incentiveIdEncoded = ethereum.encode(
    ethereum.Value.fromTuple(_incentiveTuple)
  )!;
  let incentiveId = crypto.keccak256(incentiveIdEncoded);

  let entity = EternalFarming.load(incentiveId.toHex());

  if(entity){
    entity.isDetached = false
    entity.save()
  } 

}

export function handleRewardsRatesChanged( event: RewardsRatesChanged): void{
  let eternalFarming = EternalFarming.load(event.params.incentiveId.toHexString())
  if(eternalFarming){
    eternalFarming.rewardRate = event.params.rewardRate
    eternalFarming.bonusRewardRate = event.params.bonusRewardRate
    eternalFarming.save()
  }
}

export function handleRewardsAdded( event: RewardsAdded): void{
  let eternalFarming = EternalFarming.load(event.params.incentiveId.toHexString())
  if(eternalFarming){
    eternalFarming.reward += event.params.rewardAmount
    eternalFarming.bonusReward += event.params.bonusRewardAmount 
    eternalFarming.save()
  }
}

export function handleCollect( event: RewardsCollected): void{

  let entity = Deposit.load(event.params.tokenId.toString());
  
  if(entity){
    let eternalFarmingID = entity.eternalFarming!.toHexString()
    let eternalFarming = EternalFarming.load(eternalFarmingID)

    if(eternalFarming){
      eternalFarming.reward -= event.params.rewardAmount
      eternalFarming.bonusReward -= event.params.bonusRewardAmount
      eternalFarming.save()
    

  let id = eternalFarming.rewardToken.toHexString() + entity.owner.toHexString()
  let rewardEntity = Reward.load(id)

  if (rewardEntity == null){
      rewardEntity = new Reward(id)
      rewardEntity.amount = BigInt.fromString('0')
  }

  rewardEntity.owner = entity.owner
  rewardEntity.rewardAddress = eternalFarming.rewardToken
  rewardEntity.amount = rewardEntity.amount.plus(event.params.rewardAmount)
  rewardEntity.save();  


  id =  eternalFarming.bonusRewardToken.toHexString() + entity.owner.toHexString()
  rewardEntity = Reward.load(id)

  if (rewardEntity == null){
    rewardEntity = new Reward(id)
    rewardEntity.amount = BigInt.fromString('0')
  }

  rewardEntity.owner = entity.owner
  rewardEntity.rewardAddress = eternalFarming.bonusRewardToken
  rewardEntity.amount = rewardEntity.amount.plus(event.params.bonusRewardAmount)
  rewardEntity.save();
}
}
} 

function getLevel(amount: BigInt, incentiveId: string): BigInt{
  let incentive = EternalFarming.load(incentiveId)
  let res = BigInt.fromString("0")
  if(incentive){
    if (incentive.tokenAmountForLevel3 <= amount )
        res = BigInt.fromString("3")
    else if (incentive.tokenAmountForLevel2 <= amount ) 
            res = BigInt.fromString("2")
        else if (incentive.tokenAmountForLevel1 <= amount)
              res = BigInt.fromString("1")
  }
  return res 
} 
