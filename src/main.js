const core = require('@actions/core')
const { wait } = require('./wait')
const github = require('@actions/github')

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

    const refs = await octokit.rest.git.listMatchingRefs({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      ref: '*'
    })

    const tags = await octokit.rest.repos.listTags({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo
    })

    for (const tag of tags.data) {
      core.info(tag.name)
    }

    core.info(JSON.stringify(refs))

    for (const ref of refs.data) {
      core.info(ref.ref)
    }

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
