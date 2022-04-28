# Marketplace for ERC721
## Struct & Const & Enum

```
CollectionInfoStruct {
1. name
2. symbol
3. total_supply (u64)
4. issuer (AccountId)
}
```
```
NftInfoStruct {
1. collection_id
2. index // u128 - this will start from 0 for first NFT
3. title
4. info
5. metadata (included Hash, URI) ***
6. issuer
7. owner
8. nft_status // enum [normal, selling, paying_instalment]
9. is_locked // for future
10. is_hidden // for future
}
```
```
const instalment_delay_charge_percentage_per_day = 0.05%; // DAO upgrade runtime to change
const instalment_down_payment_min = 20%; // DAO upgrade runtime
const instalment_max_delay_days = 5; // DAO upgrade runtime

NftSellOrderStruct {
1. nftId: // to link back to the sell NFT
2. price:
3. expired: // for offchain worker check & auto remove sell 
4. sell_type: enum[normal_sell, instalment_sell, auction]

// if sell_type = instalment && there is buyer 

5. instalment_account: // accountId of buyer
6. instalment_period // enum[3,6,12] - seller config
7. instalment_interest_rate_per_day // enum[high, medium, low]: seller config
8. start_date: // to calculate for instalment
9. last_paid_date: // use to check if late pay or not pay
10. paid: // calculate for instalment & check if pay instalment finish
11. next_pay_amount: // to show & recalculate if late pay
}
```


## Storage
```
// Collection
1. CollectionInfo = Map(collectionId => collectionInfoStruct) //
2. CollectionCount = SingleValue(u64)
```
~~CollectionCurrentMintIndex = Map(collectionId => u128) // To know current which of minted NFT index inside Class~~

```
// NFT
1. NftInfo = Map(nftId => nftInfoStruct) // 
2. NftsCount = SingleValue(u128) // total NFTs in market
3. NftsByOwner = Map(accountId => Vec<nftId>) // to list my NFTs, otherwise have to search all NFT to find my NFTs *** insert & delete during transfer owner nft
4. NftsByCollection = Map(collectionId => Vec<nftId>) // to list NFTs under a Collection
```
```
// NFT Sell & Buy
1. NftSellingOrder = Map(nftId => NftSellOrderStruct) // owner of NFT selling
2. NFTInstalmentByBuyer = Map(accountId => Vec<nftId>) // using for buyer installment 
```

## Extrinsic
1. create_collections(name, symbol, total_supply(defaul=1000))
- issuer = caller
- colletion_id = gen_id()
+ CollectionInfo.insert(collection_id => {name, symbol, total_supply, issuer})
+ CollectionCount++
+ NftsByCollection.insert(collection_id, []) // create empty Collection
* Event: CreateCollectionSuccess

2. mint_nft(collection_id, title, info, metadata)
- issuer = owner = caller
- nft_status = Normal
- nft_id = gen_id()
- 
* checkCollection(collection)? Error: NotPermission(CollectionNotOwned), CollectionNotExist
+ NftInfo.insert(nft_id, {collection_id, title, info, metadata, issuer, owner, nft_status})
+ NftsCount++
+ NftsByOwner.insertOrUpdate(owner, Vec<>.append(nftId))
+ NftsByCollection.update(collection_id, Vec<>.append(nftId))
* Event: MintNftSuccess

3. seller_transfer_nft (caller_id, receiver_id, nft_id) // just transfer
+ checkNftStatus == Normal // cannot transfer if NFT is selling or paying_instalment
+ helper._transfer_nft(caller_id, receiver_id, nft_id)
* Event: TransferNftSuccess

4. seller_create_sell_order(nft_id, price, expired, sell_type)
* checkNftOwner(sender_id, nft_id)? Error: NotPermission(NftNotOwned)
* checkNftSellExist(nft_d)? Error: NftSellExist
+ NftSellingOrder.insert(nft_id, {nft_id, price, expired, sell_type})
* Event: SellCreateSuccess

5. seller_cancel_sell_order(nft_id)
* checkNftOwner(sender_id, nft_id)? Error: NotPermission(NftNotOwned)
* checkNftSellExist(nft_d)? Error: NftSellExist
* checkNftStatus != paying_instalment? Error: NftCancelNotAllow // cannot cancel sell when there is buyer paying installment 
+ NftSellingOrder.delete(nft_id)
* Event: SellCancelSuccess

6. seller_edit_sell_order // change price
* checkNftOwner(sender_id, nft_id)? Error: NotPermission(NftNotOwned)
* checkNftSellExist(nft_id)? Error: NftSellExist
* checkNftStatus != paying_instalment? Error: NftEditNotAllow // cannot edit sell when there is buyer paying installment 
+ NftSellingOrder.update(nft_id, {price})
* Event: SellEditSuccess

7. _expired_sell_nft (offchain worker)
* check if NFT Sell expired
+ NftSellingOrder.delete(nft_id)

8. buyer_buy_nft (nft_id, pay) // ***complicated***
* checkNftSellExist(nft_id)? Error: NftSellExist
* checkNftStatus != paying_instalment? Error: NftBuyingNotAllow // cannot buy when another buying this Nft
* check sell_type != auction? Error: NftBuyingNotAllow
+ if sell_type == normal_sell && pay != price ?  Error: NftBuyingNotEnoughMoney
+ elseif pay == price: 
+ _transfer_nft(nft_owner, buyer_id)
+ NftSellingOrder.delete(nft_id) // delete nft sell
+ NftInfo.update(nft_id, {nft_status: normal})
- else: // sell_type == sell_instalment
- NftSellingOrder.update(nft_id, {instalment_account: caller_id,start_date: now(), last_paid_date: now(), paid = paid + pay, next_pay_amount = _calc_next_paid_amount(price - paid, instalment_period, instalment_start_date) })
- NFTInstalmentByBuyer.update(caller_id, Vec<>.append(nft_id))
- NftInfo.update(nft_id, {nft_status: paying_instalment})
- 





9. buyer_make_offer_nft // not need now


10. buyer_pay_instalment(nft, pay) // ***complicated***
* checkNftSellExist(nft_id)? Error: NftSellExist
* checkInstalmentByBuyer(caller, nft_id)? Error: NftInstalmentNotAllow
+ if pay + paid == price: 
+ _transfer_nft(nft_owner, buyer_id)
+ NftSellingOrder.delete(nft_id) // delete nft sell
+ NftInfo.update(nft_id, {nft_status: normal})
- else: // 
- NftSellingOrder.update(nft_id, {instalment_account: caller_id, last_paid_date: now(), paid = paid + pay, next_pay_amount = _calc_next_paid_amount(price - paid, instalment_period, start_date) })
- NFTInstalmentByBuyer.update(caller_id, Vec<>.append(nft_id))
- NftInfo.update(nft_id, {nft_status: paying_instalment})
- 


11. _check_pay_instalment // ***offchain worker
* check late pay instalment:  
* check not pay instalment

----
helper
1. _transfer_nft(sender_id, receiver_id, nft_id)
* checkNftOwner(sender_id, nft_id)? Error: NotPermission(NftNotOwned)
+ NftInfo.update(nft_id, {owner: receiver_id})
+ NftsByOwner.update(sender_id, Vec<>.remove(nft_id))
+ NftsByOwner.update(receiver_id, Vec<>.append(nft_id))

2. _calc_next_paid_amount() // ***complicated***

========
Error
1. NoPermission
2. 


