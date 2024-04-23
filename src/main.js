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

    const path = '.version'

    let getContentResponse = null
    let fileVersion = null
    try {
      getContentResponse = await octokit.rest.repos.getContent({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        path,
        ref: github.context.ref
      })
    } catch (error) {
      core.info(JSON.stringify(error))
      if (error.status === 404) {
        core.info('File not found')
        fileVersion = new semver.SemVer('0.0.0')
      } else {
        throw error
      }
    }

    if (!fileVersion) {
      const content = Buffer.from(getContentResponse.data.content, 'base64')
        .toString('utf8')
        .trim()
        .trim('\r')
        .trim('\n')
        .trim()
      core.info(`File content: ${content}`)

      if (!semver.valid(`${content}.0`)) {
        throw Error(
          `Invalid version file content: ${content}. Expected format: N.N`
        )
      }
      fileVersion = semver.parse(`${content}.0`)
    }

    // Set the output value
    let page = 1
    let tags = []
    let response = null
    do {
      response = await octokit.rest.repos.listTags({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        per_page: 100,
        page
      })
      if (response.status !== 200) {
        throw Error('Failed to get tags')
      }

      if (response.data.length === 0) {
        break
      }

      tags = tags.concat(response.data)
      page++
    } while (response.data.length > 0)

    const versions = tags
      .filter(
        x =>
          x.name.startsWith(tagPrefix) &&
          semver.valid(x.name.substring(tagPrefix.length))
      )
      .map(x => semver.parse(x.name.substring(tagPrefix.length)))

    let newVersion = undefined

    let shaForTag = github.context.sha
    if (
      github.context.ref === 'refs/heads/master' ||
      github.context.ref === 'refs/heads/main'
    ) {
      core.info(`The branch is master or main, increment minor version`)
      const minor = Math.max(-1, ...versions.map(x => x.minor))
      newVersion = new semver.SemVer(`${major}.${minor + 1}.0`)

      core.info(
        `Update version file to ${newVersion.major}.${newVersion.minor}`
      )
      const newComment = await octokit.rest.repos.createOrUpdateFileContents({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        path,
        message: `Update version to ${newVersion.major}.${newVersion.minor}`,
        content: Buffer.from(
          `${newVersion.major}.${newVersion.minor}`
        ).toString('base64'),
        sha: getContentResponse?.data.sha ?? undefined
      })

      if (newComment.status !== 200 && newComment.status !== 201) {
        throw Error('Failed to update version file')
      }

      shaForTag = newComment.data.commit.sha
    } else if (github.context.ref.startsWith('refs/heads/patch/')) {
      core.info(`The branch is patch, increment patch version`)
      const minor = fileVersion.minor
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
      const minor = fileVersion.minor
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
      message: `New tag ${newTagName} is created`,
      object: shaForTag
    })

    core.debug(JSON.stringify(createTagResponse))

    const newTagReference = `refs/tags/${newTagName}`
    await octokit.rest.git.createRef({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      ref: newTagReference,
      sha: shaForTag
    })

    core.info(`Tag created: ${newTagName}`)

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
