const core = require('@actions/core')
const github = require('@actions/github')
const semver = require('semver')

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

    const tags = await octokit.rest.repos.listTags({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo
    })

    if (tags.status !== 200) {
      throw Error('Failed to get tags')
    }

    const versions = tags.data
      .filter(
        x =>
          x.name.startsWith(tagPrefix) &&
          semver.valid(x.name.substring(tagPrefix.length))
      )
      .map(x => semver.parse(x.name.substring(tagPrefix.length)))

    for (const tag of tags.data) {
      core.info(tag.name)
    }

    let newVersion = undefined

    if (
      github.context.ref === 'refs/heads/master' ||
      github.context.ref === 'refs/heads/main'
    ) {
      core.info(`The branch is master or main, increment minor version`)
      const minor = Math.max(-1, ...versions.map(x => x.minor))
      newVersion = new semver.SemVer(`${major}.${minor + 1}.0`)
    } else if (github.context.ref.startsWith('refs/heads/patch/')) {
      core.info(`The branch is patch, increment patch version`)
      const minor = Math.max(0, ...versions.map(x => x.patch))
      const build = Math.max(
        -1,
        ...versions
          .filter(x => x.patch < 20000 && x.minor === minor)
          .map(x => x.patch)
      )
      newVersion = new semver.SemVer(`${major}.${minor}.${build + 1}`)
    } else {
      core.info(
        `The branch is feature, increment patch version starting from 20000`
      )
      const minor = Math.max(0, ...versions.map(x => x.minor))
      const build = Math.max(
        19999,
        ...versions
          .filter(x => x.patch >= 20000 && x.minor === minor)
          .map(x => newVersion.patch)
      )
      newVersion = new semver.SemVer(`${major}.${minor}.${build + 1}`)
    }

    const newTagName = `${tagPrefix}${newVersion.version}`
    core.info(`Create a new tag: ${newTagName}`)
    const createTagResponse = await octokit.rest.git.createTag({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      tag: newTagName,
      type: 'commit',
      message: `New version is created`,
      object: github.context.sha
    })

    if (createTagResponse.status !== 201) {
      throw Error(`Failed to create tag ${newTagName}`)
    }

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
