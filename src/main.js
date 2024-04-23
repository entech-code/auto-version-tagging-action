const core = require('@actions/core')
const github = require('@actions/github')
const semver = require('semver')
const { fetchFileContentIfExists, createTag } = require('./github-helpers')
const {
  getVersions,
  incrementVersion,
  updateVersionFile
} = require('./helpers')

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  try {
    const myToken = core.getInput('token')
    const major = core.getInput('majorVersion')
    const tagPrefix = core.getInput('tagPrefix')

    const octokit = github.getOctokit(myToken)
    core.info(`Tag prefix: ${tagPrefix}`)
    core.info(`Context ref: ${github.context.ref}`)

    const versionFilePath = '.version'

    const { fileContent, fileSha } = await fetchFileContentIfExists(
      octokit,
      versionFilePath
    )

    core.info(`File content: ${fileContent}, ${fileSha}`)

    let fileVersion = new semver.SemVer('0.0.0')
    if (fileContent) {
      const content = fileContent.trim().trim('\r').trim('\n').trim()
      if (!semver.valid(`${content}.0`)) {
        throw Error(
          `Invalid version file content: ${content}. Expected format: N.N`
        )
      }
      fileVersion = semver.parse(`${content}.0`)
    }

    const versions = await getVersions(octokit, tagPrefix)
    const newVersion = incrementVersion(major, versions, fileVersion)
    const codeSha = await updateVersionFile(
      octokit,
      newVersion,
      versionFilePath,
      fileSha
    )

    const newTagName = await createTag(
      octokit,
      github.context.repo.owner,
      github.context.repo.repo,
      `${tagPrefix}${newVersion.version}`,
      tagPrefix,
      codeSha
    )

    core.setOutput('version', newVersion.version)
    core.setOutput('tag', newTagName)
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message)
  }
}

module.exports = {
  run
}
