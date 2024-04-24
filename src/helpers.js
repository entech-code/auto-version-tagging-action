const { fetchAllTags } = require('./github-helpers')
const semver = require('semver')
const github = require('@actions/github')
const core = require('@actions/core')

export async function getVersions(octokit, tagPrefix) {
  const tags = await fetchAllTags(
    octokit,
    github.context.repo.owner,
    github.context.repo.repo
  )

  const versions = tags
    .filter(
      x =>
        x.name.startsWith(tagPrefix) &&
        semver.valid(x.name.substring(tagPrefix.length))
    )
    .map(x => semver.parse(x.name.substring(tagPrefix.length)))
  return versions
}

export function isMainBranch(branchName) {
  return branchName === 'master' || branchName === 'main'
}

export function isPatchBranch(branchName) {
  return branchName.startsWith('patch/')
}

export function incrementVersion(major, allVersions, codeVersion, branchName) {
  if (isMainBranch(branchName)) {
    core.info(`The branch is master or main, increment minor version`)
    const minor = Math.max(
      -1,
      ...allVersions.filter(x => x.major === Number(major)).map(x => x.minor)
    )
    return new semver.SemVer(`${major}.${minor + 1}.0`)
  }

  if (isPatchBranch(branchName)) {
    core.info(`The branch is patch, increment patch version`)
    const minor = codeVersion.minor
    const build = Math.max(
      -1,
      ...allVersions
        .filter(x => x.major === Number(major))
        .filter(x => x.patch < 20000 && x.minor === minor)
        .map(x => x.patch)
    )
    return new semver.SemVer(`${major}.${minor}.${build + 1}`)
  }

  core.info(
    `The branch is feature, increment patch version starting from 20000`
  )
  const minor = codeVersion.minor
  const build = Math.max(
    19999,
    ...allVersions
      .filter(x => x.major === Number(major))
      .filter(x => x.patch >= 20000 && x.minor === minor)
      .map(x => x.patch)
  )
  return new semver.SemVer(`${major}.${minor}.${build + 1}`)
}

export async function updateVersionFile(
  octokit,
  newVersion,
  versionFilePath,
  versionFileSha
) {
  core.info(`Update version file to ${newVersion.major}.${newVersion.minor}`)
  const newComment = await octokit.rest.repos.createOrUpdateFileContents({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    path: versionFilePath,
    message: `Update version to ${newVersion.major}.${newVersion.minor}`,
    content: Buffer.from(`${newVersion.major}.${newVersion.minor}`).toString(
      'base64'
    ),
    sha: versionFileSha ?? undefined
  })

  return newComment.data.commit.sha
}

export function verifyVersionExists(seekVersion, versions) {
  core.info(`Verify version ${seekVersion} exists`)
  const version = semver.parse(seekVersion)
  if (!version) {
    throw Error(`Invalid version: ${seekVersion}`)
  }

  const existingVersion = versions.find(
    x => semver.compare(x, seekVersion) === 0
  )

  if (existingVersion) {
    return true
  }

  throw Error(`Version ${seekVersion} not found`)
}
