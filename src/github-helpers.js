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
    core.info(JSON.stringify(error))
    if (error.status === 404) {
      return [null, null]
    } else {
      throw error
    }
  }
  const content = Buffer.from(
    getContentResponse.data.content,
    'base64'
  ).toString('utf8')

  core.info(`File ${filePath} content: ${content}`)
  return { fileContent: content, fileSha: getContentResponse.data.sha }
}

export async function createTag(octokit, owner, repo, newTagName, shaForTag) {
  core.info(`Create a new tag: ${newTagName}`)
  await octokit.rest.git.createTag({
    owner,
    repo,
    tag: newTagName,
    type: 'commit',
    message: `New tag ${newTagName} is created`,
    object: shaForTag
  })

  const newTagReference = `refs/tags/${newTagName}`
  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: newTagReference,
    sha: shaForTag
  })

  core.info(`Tag created: ${newTagName}`)

  return newTagName
}
