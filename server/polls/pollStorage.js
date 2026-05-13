const Poll = require("../models/Poll");

async function ensurePollsFile() {
  return true;
}

async function loadPolls() {
  try {
    const docs = await Poll.find({}).lean();
    const result = {};

    for (const doc of docs) {
      result[doc.pollId] = doc;
    }

    return result;
  } catch (error) {
    console.error("[PollStorage] Failed to load polls from Mongo:", error);
    return {};
  }
}

async function savePolls(data = {}) {
  try {
    const entries = Object.entries(data);

    for (const [, pollData] of entries) {
      if (!pollData?.pollId) continue;

      await Poll.findOneAndUpdate(
        { pollId: pollData.pollId },
        { $set: pollData },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );
    }

    return true;
  } catch (error) {
    console.error("[PollStorage] Failed to save polls to Mongo:", error);
    return false;
  }
}

async function getPoll(pollId) {
  try {
    return await Poll.findOne({ pollId }).lean();
  } catch (error) {
    console.error("[PollStorage] Failed to get poll:", error);
    return null;
  }
}

async function setPoll(pollId, pollData) {
  try {
    await Poll.findOneAndUpdate(
      { pollId },
      {
        $set: {
          ...pollData,
          pollId,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
    return true;
  } catch (error) {
    console.error("[PollStorage] Failed to set poll:", error);
    return false;
  }
}

async function deletePoll(pollId) {
  try {
    await Poll.deleteOne({ pollId });
    return true;
  } catch (error) {
    console.error("[PollStorage] Failed to delete poll:", error);
    return false;
  }
}

async function getAllPolls() {
  return loadPolls();
}

module.exports = {
  ensurePollsFile,
  loadPolls,
  savePolls,
  getPoll,
  setPoll,
  deletePoll,
  getAllPolls,
};