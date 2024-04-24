const core = require('@actions/core')
const github = require('@actions/github')
const semver = require('semver')
const {
  fetchFileContentIfExists,
  createTag,
  getBranchName
} = require('./github-helpers')
const {
  getVersions,
  incrementVersion,
  updateVersionFile,
  verifyVersionExists,
  isMainBranch
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
    const seekVersion = core.getInput('seekVersion')

    const octokit = github.getOctokit(myToken)
    core.info(`Tag prefix: ${tagPrefix}`)
    core.info(`Context ref: ${github.context.ref}`)

    const branchName = await getBranchName(octokit)
    const versions = await getVersions(octokit, tagPrefix)

    if (seekVersion && verifyVersionExists(seekVersion, versions)) {
      core.setOutput('version', seekVersion)
      core.setOutput('tag', `${tagPrefix}${seekVersion}`)
      core.notice(`The determined version is: ${seekVersion}`)
      core.notice(`The branch name is: ${branchName}`)
      return
    }

    const versionFilePath = '.version'

    const { fileContent, fileSha } = await fetchFileContentIfExists(
      octokit,
      versionFilePath
    )

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

    const newVersion = incrementVersion(
      major,
      versions,
      fileVersion,
      branchName
    )

    const codeSha = isMainBranch(branchName)
      ? await updateVersionFile(octokit, newVersion, versionFilePath, fileSha)
      : github.context.sha

    const newTagName = await createTag(
      octokit,
      `${tagPrefix}${newVersion.version}`,
      codeSha
    )

    core.setOutput('version', newVersion.version)
    core.setOutput('tag', newTagName)
    core.notice(`The determined version is: ${newVersion.version}`)
    core.notice(`The branch name is: ${branchName}`)
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message)
  }
}

module.exports = {
  run
}
