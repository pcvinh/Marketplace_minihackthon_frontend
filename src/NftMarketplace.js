import React, { useEffect, useState } from 'react'
import { Form, Input, Grid } from 'semantic-ui-react'

// Pre-built Substrate front-end utilities for connecting to a node
// and making a transaction.
import { useSubstrateState } from './substrate-lib'
import { TxButton } from './substrate-lib/components'

// Polkadot-JS utilities for hashing data.
import { blake2AsHex } from '@polkadot/util-crypto'
import TemplateModuleItems from './NftCard'

const parseNft = ({ nftId, title, description, metadata, issuer, owner, price, nftStatus }) => ({
  nftId: nftId.toHuman(),
  title: title.toString(),
  description: description.toString(),
  metadata: metadata.toString(),
  issuer: issuer.toJSON(),
  owner: owner.toJSON(),
  price: price.toJSON(),
  nftStatus: nftStatus.toJSON()
})

const acctAddr = acct => (acct ? acct.address : '')

// Main Proof Of Existence component
function Main(props) {
  // Establish an API to talk to the Substrate node.
  const { api, currentAccount } = useSubstrateState()
  // React hooks for all the state variables we track.
  // Learn more at: https://reactjs.org/docs/hooks-intro.html
  const [status, setStatus] = useState('')
  const [digest, setDigest] = useState('')
  const [nftIds, setNftIds] = useState([])
  const [nfts, setNfts] = useState([])
  const [buyingNftIds, setBuyingNftIds] = useState([])

  // Our `FileReader()` which is accessible from our functions below.
  let fileReader;
  // Takes our file, and creates a digest using the Blake2 256 hash function
  const bufferToDigest = () => {
    // Turns the file content to a hexadecimal representation.
    const content = Array.from(new Uint8Array(fileReader.result))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const hash = blake2AsHex(content, 256);
    setDigest(hash);
  };

  // Callback function for when a new file is selected.
  const handleFileChosen = file => {
    fileReader = new FileReader();
    fileReader.onloadend = bufferToDigest;
    fileReader.readAsArrayBuffer(file);
  };

  const subscribeCount = () => {
    let unsub = null

    const asyncFetch = async () => {
      unsub = await api.query.palletMarket.nftsCount(async count => {
        // Fetch all kitty keys
        const entries = await api.query.palletMarket.nfts.entries()
        const data = entries.map(([{args: [key]}, exposure]) => {
          console.log('key arguments:', key.toHex());
          console.log('     exposure:', exposure.toHuman());
          return key;
        });
        setNftIds(data)
      })
    }

    asyncFetch()

    return () => {
      unsub && unsub()
    }
  }

  const subscribeNfts = () => {
    let unsub = null

    const asyncFetch = async () => {
      // subscribe to all Nfts to
      unsub = await api.query.palletMarket.nfts.multi(
        nftIds,
        nfts => {
          const nftsMap = nfts.map(nft => parseNft(nft.unwrap()))
          setNfts(nftsMap)
        }
      )
    }

    asyncFetch()

    return () => {
      unsub && unsub()
    }
  }

  const subscribeAccount = () => {
    let unsubscribe

    // If the user has selected an address, create a new subscription
    currentAccount &&
      api.query.palletMarket
        .buyingByBuyer(acctAddr(currentAccount), nftIds => {
          setBuyingNftIds(nftIds.toHuman())
        })
        .then(unsub => (unsubscribe = unsub))
        .catch(console.error)

    return () => unsubscribe && unsubscribe()
  }

  // When account address changes, update subscriptions
  useEffect(subscribeAccount, [api, currentAccount])
  useEffect(subscribeCount, [api])
  useEffect(subscribeNfts, [api, nftIds])

  // The actual UI elements which are returned from our component.
  return (
    <>
    <Grid.Row>
    <Grid.Column width={16}>
      <h1>NFT Marketplace</h1>
      <TemplateModuleItems items={nfts} setStatus={setStatus} buyingNftIds={buyingNftIds}></TemplateModuleItems>
      
    </Grid.Column>
    </Grid.Row>
    <Grid.Row>
    <Grid.Column width={16}>
      {/* Show warning or success message if the file is or is not claimed. */}
      <Form>
        <Form.Field>
          {/* File selector with a callback to `handleFileChosen`. */}
          <Input
            type="file"
            id="file"
            label="Upload file to mint to NFT"
            onChange={e => handleFileChosen(e.target.files[0])}
          />
        </Form.Field>
        {/* Buttons for interacting with the component. */}
        <Form.Field>
          {/* Button to create a claim. Only active if a file is selected, and not already claimed. Updates the `status`. */}
          <TxButton
            label="Create NFT"
            type="SIGNED-TX"
            setStatus={setStatus}
            attrs={{
              palletRpc: 'palletMarket',
              callable: 'mintNft',
              inputParams: [0, "hello", "world", digest, "url"  ],
              paramFields: [true, true, true, true, true]
            }}
          />
        </Form.Field>
        {/* Status message about the transaction. */}
        <div style={{ overflowWrap: 'break-word' }}>{status}</div>
      </Form>
    </Grid.Column>
    </Grid.Row>
    </>
  );
}

export default function NftMarketplace(props) {
  const { api } = useSubstrateState()
  return api.query.palletMarket ? <Main {...props} /> : null

}