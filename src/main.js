const core = require('@actions/core')
const { wait } = require('./wait')
const github = require('@actions/github')
const semver = require('semver')

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  try {
    const myToken = core.getInput('myToken', { required: true })
    const ms = core.getInput('milliseconds', { required: true })

    // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
    core.info(`Waiting ${ms} milliseconds ...`)

    const octokit = github.getOctokit(myToken)
    core.info(github.context.repo.owner)
    core.info(github.context.repo.repo)
    core.info(`ref: ${github.context.ref}`)

    const tags = await octokit.rest.repos.listTags({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo
    })

    for (const tag of tags.data) {
      core.info(tag.name)
    }

    // if (branchName === 'master' || branchName === 'main') {
    //   const minor = Math.max(-1, ...tagVersions.map(version => version.minor))
    //   version = new semver.SemVer(`${major}.${minor + 1}.0`)
    // } else if (branchName.startsWith('patch/')) {
    //   const minor = Math.max(0, ...tagVersions.map(version => version.patch))
    //   const build = Math.max(
    //     -1,
    //     ...tagVersions
    //       .filter(version => version.patch < 20000 && version.minor == minor)
    //       .map(version => version.patch)
    //   )
    //   version = new semver.SemVer(`${major}.${minor}.${build + 1}`)
    // } else {
    //   const minor = Math.max(0, ...tagVersions.map(version => version.minor))
    //   const build = Math.max(
    //     19999,
    //     ...tagVersions
    //       .filter(version => version.patch >= 20000 && version.minor == minor)
    //       .map(version => version.patch)
    //   )
    //   version = new semver.SemVer(`${major}.${minor}.${build + 1}`)
    // }

    // return version.version

    await wait(parseInt(ms, 10))
    core.debug(new Date().toTimeString())

    // Set outputs for other workflow steps to use
    core.setOutput('time', new Date().toTimeString())
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message)
  }
}

module.exports = {
  run
}
