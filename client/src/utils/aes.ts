import aesjs from "aes-js";

function AESencryptCTR(text, key, arrNonce) {
    if(typeof text === 'string')
        text = aesjs.utils.hex..convertStringToBytes(text);
    var shiftedNonce = [0, 0, 0, 0, 0, 0, 0, 0 ].concat(arrNonce);
    var aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(shiftedNonce));
    var encryptedBytes = aesCtr.encrypt(text);
    return btoa(String.fromCharCode.apply(null,encryptedBytes));
}

function AESdecryptCTR(ciphertext, key, hexNonce) {
    var encryptedBytes = atob(ciphertext).split("").map(function(c) { return c.charCodeAt(0); });
    var shiftedNonce = [0, 0, 0, 0, 0, 0, 0, 0 ].concat(HexString_2_ByteArray(hexNonce));
    var aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(shiftedNonce));
    var decryptedBytes = aesCtr.decrypt(encryptedBytes);
    return aesjs.util.convertBytesToString(decryptedBytes);
}

export function AESencryptCBC_txt(text, key, iniVector) {
    text = aesjs.util.convertStringToBytes(text);
    while (text.length % 16 !== 0) //insert null padding
        text.push(0);
    var aesCBC = new aesjs.ModeOfOperation.cbc(key, iniVector);
    var encryptedBytes = aesCBC.encrypt(text);
    return btoa(String.fromCharCode.apply(null,encryptedBytes));
}

function AESdecryptCBC_txt(ciphertext, key, iniVector) {
    var encryptedBytes = atob(ciphertext).split("").map(function(c) { return c.charCodeAt(0); });
    var aesCBC = new aesjs.ModeOfOperation.cbc(key, iniVector);
    var decryptedBytes = aesCBC.decrypt(encryptedBytes);
    while (decryptedBytes[decryptedBytes.length-1] == 0) //remove null padding
        decryptedBytes.pop();
    return aesjs.util.convertBytesToString(decryptedBytes);
}

function AESencryptCBC_arr(arr, key, iniVector) {
    var aesCBC = new aesjs.ModeOfOperation.cbc(key, iniVector);
    var encryptedBytes = aesCBC.encrypt(arr);
    return btoa(String.fromCharCode.apply(null,encryptedBytes));
}

function AESdecryptCBC_arr(ciphertext, key, iniVector) {
    var encryptedBytes = atob(ciphertext).split("").map(function(c) { return c.charCodeAt(0); });
    var aesCBC = new aesjs.ModeOfOperation.cbc(key, iniVector);
    var decryptedBytes = aesCBC.decrypt(encryptedBytes);
    return decryptedBytes;
}

/* ------- utils ------- */
function HexString_2_ByteArray(hexString) {
    var result = [];
    for (var i = 0; i < hexString.length; i += 2) {
        result.push(parseInt(hexString.substr(i, 2), 16));
    }
    return result;
}

function ByteArray_2_HexString(arr) {
    var result = "";
    for (var i in arr) {
        var str = arr[i].toString(16);
        str = str.length == 0 ? "00" :
            str.length == 1 ? "0" + str :
                str.length == 2 ? str :
                    str.substring(str.length-2, str.length);
        result += str;
    }
    return result;
}