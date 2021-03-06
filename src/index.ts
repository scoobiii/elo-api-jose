import 'isomorphic-fetch'
import fs from 'fs-extra'
import path from 'path'
import Args from './args'

import { generateKeyPair, loadKeyPair } from './key';
import { getServerKey } from './serverKey'

import { jwsSign } from './jwsSign';
import { jweEncrypt } from './jweEncrypt';
import { cardData, clientConfig } from './config';

const { copy } = require('copy-paste')

async function main() {

    let result: any
    if (Args.selectedOption === 'generate-jwk') {
        result = await generateJwk()
    } else {
        if (!clientConfig.headers.client_id) {
            console.error("You should provide client_id of your application on project_dir/config/client.json")
            return
        }
        result = await encryptCardData()
    }

    const newResult = typeof result === 'string' ? result : JSON.stringify(result, null, '\t')
    if (!Args.noEmit) {
        console.log(newResult)
    }
    if (Args.output) {
        fs.ensureDirSync(path.dirname(Args.output))
        fs.writeFileSync(Args.output, newResult)
    }
    if (Args.shouldCC) {
        copy(
            Args.selectedOption === 'encrypt-card-data' ? result : JSON.stringify(result).replace('"', '\\"'),
            () => {
                console.log("\nCopied to clipboard!")
                process.exit(0)
            }
        )
    }
}

async function generateJwk() {
    return (await generateKeyPair()).public
}

async function encryptCardData() {
    let serverKey = await getServerKey()
    let key = await loadKeyPair()
    if (!key) {
        throw new Error('Key pair não encontrada')
    }
    let cardSensitiveDataStringified = JSON.stringify(cardData)

    const signedJws = await jwsSign(cardSensitiveDataStringified, key.pair)
    const token = await jweEncrypt(signedJws, serverKey)
    return token
}

if (!Args.help) {
    main()
}