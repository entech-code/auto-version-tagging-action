const core = require('@actions/core')
const { wait } = require('./wait')
const github = require('@actions/github')

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  try {
    const ms = core.getInput('milliseconds', { required: true })

    // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
    core.info(`Waiting ${ms} milliseconds ...`)

    const myToken = core.getInput('myToken')
    const octokit = github.getOctokit(myToken)

    const refs = await octokit.rest.git.listMatchingRefs(
      github.context.repo.owner,
      github.context.repo.repo,
      '*'
    )

    console.log(`Hello!`)

    for (const ref of refs.data) {
      core.info(ref.ref)
      github.info(ref.ref)
      console.log(ref.ref)
    }

    github.info(new Date().toTimeString())
    // Log the current timestamp, wait, then log the new timestamp
    core.debug(new Date().toTimeString())

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
