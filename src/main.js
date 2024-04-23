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
    const major = core.getInput('major', { required: true })

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

    const versions = tags.data.map(x => semver.parse(x))
    for (const tag of tags.data) {
      core.info(tag.name)
    }

    let newVersion = undefined

    if (
      github.context.ref === 'refs/heads/master' ||
      github.context.ref === 'refs/heads/main'
    ) {
      const minor = Math.max(-1, ...versions.map(x => x.minor))
      newVersion = new semver.SemVer(`${major}.${minor + 1}.0`)
    } else if (github.context.ref.startsWith('refs/heads/patch/')) {
      const minor = Math.max(0, ...versions.map(x => x.patch))
      const build = Math.max(
        -1,
        ...versions
          .filter(x => x.patch < 20000 && x.minor === minor)
          .map(x => x.patch)
      )
      newVersion = new semver.SemVer(`${major}.${minor}.${build + 1}`)
    } else {
      const minor = Math.max(0, ...versions.map(x => x.minor))
      const build = Math.max(
        19999,
        ...versions
          .filter(x => x.patch >= 20000 && x.minor === minor)
          .map(x => newVersion.patch)
      )
      newVersion = new semver.SemVer(`${major}.${minor}.${build + 1}`)
    }

    // return version.version
    // await wait(parseInt(ms, 10))
    core.info(newVersion.version)
    // core.debug(new Date().toTimeString())

    // Set outputs for other workflow steps to use
    core.setOutput('pastVersion', newVersion.version)
    core.setOutput('version', newVersion.version)
    core.setOutput('time', new Date().toTimeString())
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message)
  }
}

module.exports = {
  run
}
