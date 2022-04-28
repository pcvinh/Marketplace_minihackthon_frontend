import React from 'react'
import { Card, CardContent, Grid, Button, Label, Modal, Form } from 'semantic-ui-react'

import { useSubstrateState } from './substrate-lib'
import { TxButton } from './substrate-lib/components'


// --- Sell Kitty ---

const SellNft = props => {
    const { nft, setStatus } = props
    const [open, setOpen] = React.useState(false)
    const [formValue, setFormValue] = React.useState({})


    const formChange = key => (ev, el) => {
        setFormValue({ ...formValue, [key]: el.value })
    }
    
    const confirmAndClose = unsub => {
        setOpen(false)
        if (unsub && typeof unsub === 'function') unsub()
    }

    return (
        <Modal
        onClose={() => setOpen(false)}
        onOpen={() => setOpen(true)}
        open={open}
        trigger={
            <Button basic color="green">
                Sell Nft
            </Button>
        }
        >
        <Modal.Header>Start Selling Your NFT</Modal.Header>
        <Modal.Content>
            <Form>
            <Form.Input fluid label="NFT ID" readOnly value={nft.nftId} />
            <Form.Input
                fluid
                label="Price"
                placeholder="Enter Price"
                onChange={formChange('price')}
            />
            <Form.Input
                fluid
                label="Expire"
                placeholder="Enter seconds to expire"
                onChange={formChange('expire')}
            />
            <Form.Input
                fluid
                label="Pay Duration"
                placeholder="Enter seconds for instalment paying duration"
                onChange={formChange('duration')}
            />
            </Form>
        </Modal.Content>
        <Modal.Actions>
            <Button basic color="grey" onClick={() => setOpen(false)}>
            Cancel
            </Button>
            <TxButton
            label="Sell Nft"
            type="SIGNED-TX"
            setStatus={setStatus}
            onClick={confirmAndClose}
            attrs={{
                palletRpc: 'palletMarket',
                callable: 'createSale',
                inputParams: [nft.nftId, formValue.price, Math.round(formValue.expire/6), 0, Math.round(formValue.duration)],
                paramFields: [true, true, true, true, true],
            }}
            />
        </Modal.Actions>
        </Modal>
    )
}

// --- Buy NFT ---

const BuyNft = props => {
    const { nft, setStatus, isInstalment } = props
    const [open, setOpen] = React.useState(false)
    const [formValue, setFormValue] = React.useState({})
    const { api } = useSubstrateState();
    const [sellingInfo, setSellingInfo] = React.useState({})


    const formChange = key => (ev, el) => {
        setFormValue({ ...formValue, [key]: el.value })
    }  
    const confirmAndClose = unsub => {
      setOpen(false)
      if (unsub && typeof unsub === 'function') unsub()
    }
  
    if (!nft.price) {
      return <></>
    }

    const querySellingInfo = async () => {
        const temp =  await api.query.palletMarket.sellingInfo(nft.nftId);
        setSellingInfo(temp.toJSON())
    }

    // const {price, expired, paid, nextPayAmount} =  api.query.palletMarket.sellingInfo(nft.nftId);

    

    return (
      <Modal
        onClose={() => setOpen(false)}
        onOpen={() => {
                querySellingInfo()
                setOpen(true)
            }
        }
        open={open}
        trigger={
          <Button basic color="blue">
            { isInstalment ? 'Pay Instalment' : 'Buy NFT' }
          </Button>
        }
      >
        <Modal.Header>Buy Nft</Modal.Header>
        <Modal.Content>
          <Form>
            <Form.Input fluid label="NFT ID" readOnly value={nft.nftId} />
            { isInstalment ? (
                <>
                    <Form.Input fluid label="NFT Price" readOnly value={sellingInfo.price} />
                    <Form.Input fluid label="NFT Paid" readOnly value={sellingInfo.paid} />
                    <Form.Input fluid label="NFT Next Pay Amound" readOnly value={sellingInfo.nextPayAmount} />
                </>
                ) : (
                <>
                    <Form.Input fluid label="NFT Price" readOnly value={sellingInfo.price} />
                    <Form.Input fluid label="NFT Sale Expire" readOnly value={sellingInfo.expired} />
                </>
                )}
            
            <Form.Input
                fluid
                label="Pay"
                placeholder="Enter Deposit"
                onChange={formChange('target')}
            />
          </Form>
        </Modal.Content>
        <Modal.Actions>
          <Button basic color="grey" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <TxButton
            label="Buy NFT"
            type="SIGNED-TX"
            setStatus={setStatus}
            onClick={confirmAndClose}
            attrs={{
              palletRpc: 'palletMarket',
              callable: 'buyerDepositInstalment',
              inputParams: [nft.nftId, formValue.target],
              paramFields: [true, true],
            }}
          />
        </Modal.Actions>
      </Modal>
    )
  }

function NftCard(props) {
    let {nft, setStatus, buyingNftIds} = props;
    const { currentAccount } = useSubstrateState()
    const isSelf = currentAccount.address === nft.owner

    console.log(nft.price);
    return (
        <Card>
            {isSelf && (
                <Label as="a" color="teal">
                My NFT
                </Label>
            )}
            <CardContent>
                <Card.Meta style={{ fontSize: '.9em', overflowWrap: 'break-word' }}>
                    NFT Id: {nft.nftId}
                </Card.Meta>
                <Card.Description>
                    <p style={{ overflowWrap: 'break-word' }}>Title: {nft.title}</p>
                    <p style={{ overflowWrap: 'break-word' }}>Issuer: {nft.issuer}</p>
                    <p style={{ overflowWrap: 'break-word' }}>Owner: {nft.owner}</p>
                    <p style={{ overflowWrap: 'break-word' }}>
                        Price: {nft.price || 'Not For Sale'}
                    </p>
                    <p style={{ overflowWrap: 'break-word' }}>Status: {nft.nftStatus}</p>
                </Card.Description>
            </CardContent>
            <Card.Content extra style={{ textAlign: 'center' }}>
                {nft.owner === currentAccount.address ? (
                <>
                    {nft.nftStatus === 'Normal' && (<SellNft nft={nft} setStatus={setStatus} />)}
                    {nft.nftStatus === 'SellingInstalment' && (<Button basic color="grey">
                        Cancel
                    </Button>)}
                    {nft.nftStatus === 'PayingInstalment' && (<div>
                        Paying Instalment
                    </div>)}
                </>
                ) : (
                <>
                    {nft.nftStatus === 'Normal' && (<Button basic color="yellow">
                        Make Offer
                    </Button>)}
                    {nft.nftStatus === 'SellingInstalment' && (<BuyNft nft={nft} setStatus={setStatus} isInstalment = {false}/>)}
                    {buyingNftIds !== null && buyingNftIds.includes(nft.nftId) && (<BuyNft nft={nft} setStatus={setStatus} isInstalment = {true} />)}
                </>
                )}
            </Card.Content>
        </Card>
    );
}

function NftCards(props) {

    let {items, setStatus, buyingNftIds} = props;
    console.log(buyingNftIds);
    return (
        <Grid columns={3}>
            {items.map((item, i) => (
                <Grid.Column key={`nft-${i}`}>
                    <NftCard nft={item} setStatus={setStatus} buyingNftIds={buyingNftIds}/>
              </Grid.Column>
            ))}
        </Grid>
    );
}

export default NftCards;