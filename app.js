const fs = require('fs')
const path = require('path')
const Sftp = require('ssh2-sftp-client')
const sftp = new Sftp()
const dotenv = require('dotenv')
dotenv.config()
const connection = {
    host: process.env.SFTP_HOST,
    port: process.env.SFTP_PORT,
    username: process.env.SFTP_USERNAME,
    password: process.env.SFTP_PASSWORD
}

async function main() {
    try {
        const listPath = await getListFilesSync("./src/upload/")
        const isConnected = await sftpConnect()
        if (isConnected) {
            await mkdirDirOnSFTP(listPath)
            await uploadFile(listPath)
            await sftp.end()
        }
    } catch (error) {
        console.log(error)
    }

}


const getListfiles = (pathForList) => {
    let listPathFiles = []
    const listInDirectory = fs.readdirSync(path.resolve(__dirname, pathForList))
    if (listInDirectory.length === 0) {
        return []
    }
    for (let file in listInDirectory) {
        const nowPath = path.resolve(__dirname, pathForList, listInDirectory[file])
        if (fs.lstatSync(nowPath).isDirectory()) {    // Is directory?
            const resultFromDirectory = getListfiles(nowPath)
            listPathFiles.push(resultFromDirectory)
        }
        else if (fs.lstatSync(nowPath).isFile()) {   // Is file?
            listPathFiles.push(nowPath)
        }
    }
    return listPathFiles.flat(1)
}

const getListFilesSync = (pathForList) => new Promise((resolve, reject) => {
    try {
        const result = getListfiles(pathForList)
        resolve(result)
    } catch (error) {
        reject(error)
    }
})

const mkdirDirOnSFTP = async (listPath) => {
    let newListPath = []
    listPath.forEach(element => {
        element = element.split('/')
        const pathWithoutFile = element.slice(0, -1).join('/')
        newListPath.push(pathWithoutFile)
    });
    const setOfListPath = [...new Set(newListPath)]
    const rootDir = process.env.SFTP_UPLOAD_PATH
    for (let elem in setOfListPath) {
        const fileDir = setOfListPath[elem].split('/')
        const yearDir = `${rootDir}/${fileDir[fileDir.length - 3]}`
        const monthDir = `${rootDir}/${fileDir[fileDir.length - 3]}/${fileDir[fileDir.length - 2]}`
        const dateDir = `${rootDir}/${fileDir[fileDir.length - 3]}/${fileDir[fileDir.length - 2]}/${fileDir[fileDir.length - 1]}`

        const isYearDirExists = await sftp.exists(yearDir)
        const isMonthDirExists = await sftp.exists(monthDir)
        const isDateDirExists = await sftp.exists(dateDir)

        if (!isYearDirExists) {
            await sftp.mkdir(yearDir, true)
        }
        if (!isMonthDirExists) {
            await sftp.mkdir(monthDir, true)
        }
        if (!isDateDirExists) {
            await sftp.mkdir(dateDir, true)
        }
    }

}


const uploadFile = async (files) => {
    const remotePathUpload = process.env.SFTP_UPLOAD_PATH
    for (let elem in files) {
        const fileSplit = files[elem].split('/')
        const yearDir = fileSplit[fileSplit.length - 4]
        const monthDir = fileSplit[fileSplit.length - 3]
        const dateDir = fileSplit[fileSplit.length - 2]
        const fileName = fileSplit[fileSplit.length - 1]

        const remoteDirectoryUploader = `${remotePathUpload}/${yearDir}/${monthDir}/${dateDir}/${fileName}`
        const localDirectoryUploader = files[elem]
        await sftp.put(localDirectoryUploader, remoteDirectoryUploader)
    }
    return
}





async function sftpConnect() {
    return await sftp.connect(connection)
}

main()
