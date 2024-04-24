const core = require('@actions/core')
const github = require('@actions/github')

export async function fetchAllTags(octokit, owner, repo) {
  let page = 1
  let tags = []
  let response = null
  do {
    response = await octokit.rest.repos.listTags({
      owner,
      repo,
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

  return tags
}

export async function fetchFileContentIfExists(octokit, filePath) {
  let getContentResponse = null
  try {
    getContentResponse = await octokit.rest.repos.getContent({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      ref: github.context.ref,
      path: filePath
    })
  } catch (error) {
    if (error.status === 404) {
      return { fileContent: null, fileSha: null }
    } else {
      throw error
    }
  }
  const content = Buffer.from(
    getContentResponse.data.content,
    'base64'
  ).toString('utf8')

  core.info(
    `File ${filePath} (sha: ${getContentResponse.data.sha}) content: ${content}`
  )
  return { fileContent: content, fileSha: getContentResponse.data.sha }
}

export async function createTag(octokit, newTagName, shaForTag) {
  core.info(`Create a new tag: ${newTagName}`)
  await octokit.rest.git.createTag({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    tag: newTagName,
    type: 'commit',
    message: `New tag ${newTagName} is created`,
    object: shaForTag
  })

  const newTagReference = `refs/tags/${newTagName}`
  core.info(`Create a new tag ref: ${newTagReference}`)
  await octokit.rest.git.createRef({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    ref: newTagReference,
    sha: shaForTag
  })

  core.info(`Tag created: ${newTagName}`)

  return newTagName
}

export async function getBranchName(octokit) {
  if (github.context.ref.startsWith('refs/pull/')) {
    core.info(`ref is a pull request. Loading pull request`)
    const pullNumber = github.context.ref.split('/')[2]
    const pull = await octokit.rest.pulls.get({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      pull_number: pullNumber
    })
    core.info(`Source branch name in the pull request: ${pull.data.head.ref}`)
    return pull.data.head.ref
  }

  if (github.context.ref.startsWith('refs/heads/')) {
    const branchName = github.context.ref.substring('refs/heads/'.length)
    core.info(`Branch name: ${branchName}`)
    return branchName
  }

  throw Error('This action only works on branches and pull requests')
}
