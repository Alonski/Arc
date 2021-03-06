const helpers = require('./helpers');
import { getValueFromLogs } from './helpers';
const GenesisProtocol = artifacts.require("./GenesisProtocol.sol");
const Reputation = artifacts.require("./Reputation.sol");
const Avatar = artifacts.require("./Avatar.sol");
const ExecutableTest = artifacts.require("./ExecutableTest.sol");
const constants = require("./constants");
const StandardTokenMock = artifacts.require('./test/StandardTokenMock.sol');
const DaoCreator = artifacts.require("./DaoCreator.sol");
const DAOToken = artifacts.require("./DAOToken.sol");
const GenesisProtocolFormulasMock = artifacts.require("./test/GenesisProtocolFormulasMock.sol");

export class GenesisProtocolParams {
  constructor() {
  }
}

const setupGenesisProtocolParams = async function(
                                            testSetup,
                                            _preBoostedVoteRequiredPercentage=50,
                                            _preBoostedVotePeriodLimit=60,
                                            _boostedVotePeriodLimit=60,
                                            _thresholdConstA=1,
                                            _thresholdConstB=1,
                                            _minimumStakingFee=0,
                                            _quietEndingPeriod=0,
                                            _proposingRepRewardConstA=60,
                                            _proposingRepRewardConstB=1,
                                            _stakerFeeRatioForVoters=1,
                                            _votersReputationLossRatio=10,
                                            _votersGainRepRatioFromLostRep=80,
                                            _governanceFormulasInterface=0
                                            ) {
  var genesisProtocolParams = new GenesisProtocolParams();
  await testSetup.genesisProtocol.setParameters([_preBoostedVoteRequiredPercentage,
                                                 _preBoostedVotePeriodLimit,
                                                 _boostedVotePeriodLimit,
                                                 _thresholdConstA,
                                                 _thresholdConstB,
                                                 _minimumStakingFee,
                                                 _quietEndingPeriod,
                                                 _proposingRepRewardConstA,
                                                 _proposingRepRewardConstB,
                                                 _stakerFeeRatioForVoters,
                                                 _votersReputationLossRatio,
                                                 _votersGainRepRatioFromLostRep], _governanceFormulasInterface);
  genesisProtocolParams.paramsHash = await testSetup.genesisProtocol.getParametersHash([_preBoostedVoteRequiredPercentage,
                                                 _preBoostedVotePeriodLimit,
                                                 _boostedVotePeriodLimit,
                                                 _thresholdConstA,
                                                 _thresholdConstB,
                                                 _minimumStakingFee,
                                                 _quietEndingPeriod,
                                                 _proposingRepRewardConstA,
                                                 _proposingRepRewardConstB,
                                                 _stakerFeeRatioForVoters,
                                                 _votersReputationLossRatio,
                                                 _votersGainRepRatioFromLostRep], _governanceFormulasInterface);
  return genesisProtocolParams;
};


const setupOrganization = async function (daoCreator,daoCreatorOwner,founderToken,founderReputation,controller=0) {
  var org = new helpers.Organization();
  var tx = await daoCreator.forgeOrg("testOrg","TEST","TST",daoCreatorOwner,founderToken,founderReputation,controller,{gas: constants.GENESIS_SCHEME_GAS_LIMIT});
  assert.equal(tx.logs.length, 1);
  assert.equal(tx.logs[0].event, "NewOrg");
  var avatarAddress = tx.logs[0].args._avatar;
  org.avatar = await Avatar.at(avatarAddress);
  var tokenAddress = await org.avatar.nativeToken();
  org.token = await DAOToken.at(tokenAddress);
  var reputationAddress = await org.avatar.nativeReputation();
  org.reputation = await Reputation.at(reputationAddress);
  return org;
};



const setup = async function (accounts,_preBoostedVoteRequiredPercentage=50,
                                      _preBoostedVotePeriodLimit=60,
                                      _boostedVotePeriodLimit=60,
                                      _thresholdConstA=1,
                                      _thresholdConstB=1,
                                      _minimumStakingFee=0,
                                      _quietEndingPeriod=0,
                                      _proposingRepRewardConstA=60,
                                      _proposingRepRewardConstB=1,
                                      _stakerFeeRatioForVoters=1,
                                      _votersReputationLossRatio=10,
                                      _votersGainRepRatioFromLostRep=80,
                                      _governanceFormulasInterface=0) {
   var testSetup = new helpers.TestSetup();
   testSetup.standardTokenMock = await StandardTokenMock.new(accounts[0],1000);
   testSetup.genesisProtocol = await GenesisProtocol.new(testSetup.standardTokenMock.address);
   testSetup.daoCreator = await DaoCreator.new({gas:constants.GENESIS_SCHEME_GAS_LIMIT});
   testSetup.reputationArray = [20, 10, 70 ];
   testSetup.org = await setupOrganization(testSetup.daoCreator,[accounts[0],accounts[1],accounts[2]],[1000,1000,1000],testSetup.reputationArray);
   testSetup.genesisProtocolParams= await setupGenesisProtocolParams(testSetup,_preBoostedVoteRequiredPercentage,
                                         _preBoostedVotePeriodLimit,
                                         _boostedVotePeriodLimit,
                                         _thresholdConstA,
                                         _thresholdConstB,
                                         _minimumStakingFee,
                                         _quietEndingPeriod,
                                         _proposingRepRewardConstA,
                                         _proposingRepRewardConstB,
                                         _stakerFeeRatioForVoters,
                                         _votersReputationLossRatio,
                                         _votersGainRepRatioFromLostRep,
                                         _governanceFormulasInterface);
   var permissions = "0x00000000";
   testSetup.executable = await ExecutableTest.new();
   await testSetup.daoCreator.setSchemes(testSetup.org.avatar.address,[testSetup.genesisProtocol.address],[testSetup.genesisProtocolParams.paramsHash],[permissions]);

   return testSetup;
};

const checkProposalInfo = async function(proposalId, _proposalInfo,genesisProtocol) {
  let proposalInfo;
  proposalInfo = await genesisProtocol.proposals(proposalId);

  // proposalInfo has the following structure
  // address avatar;
  assert.equal(proposalInfo[0], _proposalInfo[0]);
  // uint numOfChoices;
  assert.equal(proposalInfo[1], _proposalInfo[1]);
    // ExecutableInterface executable;
  assert.equal(proposalInfo[2], _proposalInfo[2]);
  // totalVotes
  assert.equal(proposalInfo[3], _proposalInfo[3]);
  // totalStakes
  assert.equal(proposalInfo[4], _proposalInfo[4]);
  // votersStakes
  assert.equal(proposalInfo[5], _proposalInfo[5]);
  //lostReputation
  assert.equal(proposalInfo[6], _proposalInfo[6]);
    //submittedTime; for now do not test for submittedTime
  assert.equal(proposalInfo[7], _proposalInfo[7]);
  //boostedPhaseTime;
  assert.equal(proposalInfo[8], _proposalInfo[8]);
  //state
  assert.equal(proposalInfo[9], _proposalInfo[9]);
  //winningVote
  assert.equal(proposalInfo[10], _proposalInfo[10]);
  //proposer;
  assert.equal(proposalInfo[11], _proposalInfo[11]);
  //boostedVotePeriodLimit;
  assert.equal(proposalInfo[12], _proposalInfo[12]);
  // - the mapping is simply not returned at all in the array
};

const checkVotesStatus = async function(proposalId, _votesStatus,genesisProtocol){
   return helpers.checkVotesStatus(proposalId, _votesStatus,genesisProtocol);
};

const checkIsVotable = async function(proposalId, _votable,genesisProtocol){
  let votable;

  votable = await genesisProtocol.isVotable(proposalId);
  assert.equal(votable, _votable);
};

const checkVoteInfo = async function(proposalId, voterAddress, _voteInfo, genesisProtocol) {
  let voteInfo;
  voteInfo = await genesisProtocol.voteInfo(proposalId, voterAddress);
  // voteInfo has the following structure
  // int vote;
  assert.equal(voteInfo[0], _voteInfo[0]);
  // uint reputation;
  assert.equal(voteInfo[1], _voteInfo[1]);
};

contract('GenesisProtocol', function (accounts) {

  it("Sanity checks", async function () {
      var testSetup = await setup(accounts);
      let winningVote = 2;
      let state = 2; //PreBoosted
      let lostReputation = 0;

      let numberOfChoices = 2;

      //propose a vote
      let tx = await testSetup.genesisProtocol.propose(numberOfChoices, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
      const proposalId = await getValueFromLogs(tx, '_proposalId');
      assert.isOk(proposalId);

      var submittedTime = await  web3.eth.getBlock("latest").timestamp;
      await checkProposalInfo(proposalId, [testSetup.org.avatar.address, numberOfChoices, testSetup.executable.address, 0, 0,0,lostReputation,submittedTime,0,state,winningVote,accounts[0],60],testSetup.genesisProtocol);
      await checkVotesStatus(proposalId, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],testSetup.genesisProtocol);
      await checkIsVotable(proposalId, true,testSetup.genesisProtocol);

      // now lets vote Option 2 with a minority reputation
      await testSetup.genesisProtocol.vote(proposalId, 1);

      winningVote = 1;
      lostReputation = (10 * testSetup.reputationArray[0])/100; //10 % of testSetup.reputationArray[0]


      await checkProposalInfo(proposalId, [testSetup.org.avatar.address, numberOfChoices, testSetup.executable.address, testSetup.reputationArray[0], 0,0,lostReputation,submittedTime,0,state,winningVote,accounts[0],60],testSetup.genesisProtocol);
      await checkVoteInfo(proposalId, accounts[0], [1, testSetup.reputationArray[0]],testSetup.genesisProtocol);
      await checkVotesStatus(proposalId, [0, testSetup.reputationArray[0],0],testSetup.genesisProtocol);
      await checkIsVotable(proposalId, true,testSetup.genesisProtocol);
      // another minority reputation (Option 0):
      await testSetup.genesisProtocol.vote(proposalId, 2, { from: accounts[1] });
      await checkVoteInfo(proposalId, accounts[1], [2, testSetup.reputationArray[1]],testSetup.genesisProtocol);
      lostReputation += (10 * testSetup.reputationArray[1])/100;
      await checkProposalInfo(proposalId, [testSetup.org.avatar.address, numberOfChoices, testSetup.executable.address, (testSetup.reputationArray[0] + testSetup.reputationArray[1]), 0,0,lostReputation,submittedTime,0,state,winningVote,accounts[0],60],testSetup.genesisProtocol);

      await checkVotesStatus(proposalId, [0,testSetup.reputationArray[0], testSetup.reputationArray[1]],testSetup.genesisProtocol);
      await checkIsVotable(proposalId, true,testSetup.genesisProtocol);
  });

  it("log the NewProposal event on proposing new proposal", async function() {
    var testSetup = await setup(accounts);
    let numberOfChoices = 2;
    let tx = await testSetup.genesisProtocol.propose(numberOfChoices, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
    const proposalId = await getValueFromLogs(tx, '_proposalId');
    assert.isOk(proposalId);

    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "NewProposal");
    assert.equal(tx.logs[0].args._proposalId, proposalId);
    assert.equal(tx.logs[0].args._proposer, accounts[0]);
    assert.equal(tx.logs[0].args._paramsHash, testSetup.genesisProtocolParams.paramsHash);
  });


  it("check organization params validity", async function() {
    var preBoostedVoteRequiredPercentage = 0;
    var stakerFeeRatioForVoters = 1;
    var votersReputationLossRatio = 1;
    var votersGainRepRatioFromLostRep =1 ;
    var proposingRepRewardConstB = 0;
    var scoreThresholdParamsA = 8;
    var scoreThresholdParamsB = 9;

    try {
      await setup(accounts,
                  preBoostedVoteRequiredPercentage,
                  60,
                  60,
                  scoreThresholdParamsA,
                  scoreThresholdParamsB,
                  0,
                  20,
                  60,
                  1,
                  stakerFeeRatioForVoters,
                  votersReputationLossRatio,
                  votersGainRepRatioFromLostRep,
                  0);
      assert(false, " 0 < preBoostedVoteRequiredPercentage <=100    ");
    } catch(error) {
      helpers.assertVMException(error);
    }

    preBoostedVoteRequiredPercentage = 101;


    try {
      await setup(accounts,
                  preBoostedVoteRequiredPercentage,
                  60,
                  60,
                  scoreThresholdParamsA,
                  scoreThresholdParamsB,
                  0,
                  20,
                  60,
                  1,
                  stakerFeeRatioForVoters,
                  votersReputationLossRatio,
                  votersGainRepRatioFromLostRep,
                  0);
      assert(false, " 0 < preBoostedVoteRequiredPercentage <=100    ");
    } catch(error) {
      helpers.assertVMException(error);
    }

    preBoostedVoteRequiredPercentage = 100;
    stakerFeeRatioForVoters = 101;

    try {
      await setup(accounts,
                  preBoostedVoteRequiredPercentage,
                  60,
                  60,
                  scoreThresholdParamsA,
                  scoreThresholdParamsB,
                  0,
                  20,
                  60,
                  1,
                  stakerFeeRatioForVoters,
                  votersReputationLossRatio,
                  votersGainRepRatioFromLostRep,
                  0);
      assert(false, " stakerFeeRatioForVoters <=100    ");
    } catch(error) {
      helpers.assertVMException(error);
    }
    stakerFeeRatioForVoters = 100;
    votersReputationLossRatio = 101;

    try {
      await setup(accounts,
                  preBoostedVoteRequiredPercentage,
                  60,
                  60,
                  scoreThresholdParamsA,
                  scoreThresholdParamsB,
                  0,
                  20,
                  60,
                  1,
                  stakerFeeRatioForVoters,
                  votersReputationLossRatio,
                  votersGainRepRatioFromLostRep,
                  0);
      assert(false, " votersReputationLossRatio <=100    ");
    } catch(error) {
      helpers.assertVMException(error);
    }

    votersReputationLossRatio = 100;
    votersGainRepRatioFromLostRep = 101;

    try {
      await setup(accounts,
                  preBoostedVoteRequiredPercentage,
                  60,
                  60,
                  scoreThresholdParamsA,
                  scoreThresholdParamsB,
                  0,
                  20,
                  60,
                  1,
                  stakerFeeRatioForVoters,
                  votersReputationLossRatio,
                  votersGainRepRatioFromLostRep,
                  0);
      assert(false, " votersGainRepRatioFromLostRep <=100    ");
    } catch(error) {
      helpers.assertVMException(error);
    }

    votersGainRepRatioFromLostRep = 100;

    try {
      await setup(accounts,
                  preBoostedVoteRequiredPercentage,
                  60,
                  60,
                  scoreThresholdParamsA,
                  scoreThresholdParamsB,
                  0,
                  20,
                  60,
                  proposingRepRewardConstB,
                  stakerFeeRatioForVoters,
                  votersReputationLossRatio,
                  votersGainRepRatioFromLostRep,
                  0);
      assert(false, " proposingRepRewardConstB > 0 ");
    } catch(error) {
      helpers.assertVMException(error);
    }
  });

  it("log the VoteProposal event on voting ", async function() {
    var testSetup = await setup(accounts);
    let numberOfChoices = 2;
    let tx = await testSetup.genesisProtocol.propose(numberOfChoices, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
    const proposalId = await getValueFromLogs(tx, '_proposalId');
    assert.isOk(proposalId);
    let voteTX = await testSetup.genesisProtocol.vote(proposalId, 1);

    assert.equal(voteTX.logs.length, 1);
    assert.equal(voteTX.logs[0].event, "VoteProposal");
    assert.equal(voteTX.logs[0].args._proposalId, proposalId);
    assert.equal(voteTX.logs[0].args._voter, accounts[0]);
    assert.equal(voteTX.logs[0].args._vote, 1);
    assert.equal(voteTX.logs[0].args._reputation, testSetup.reputationArray[0]);
  });

  it("should log the ExecuteProposal event", async function() {
    var testSetup = await setup(accounts);
    let numberOfChoices = 2;
    let tx = await testSetup.genesisProtocol.propose(numberOfChoices, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
    const proposalId = await getValueFromLogs(tx, '_proposalId');
    assert.isOk(proposalId);

    // now lets vote with a minority reputation
    await testSetup.genesisProtocol.vote(proposalId, 1);

    // // the decisive vote is cast now and the proposal will be executed
    tx = await testSetup.genesisProtocol.vote(proposalId, 2, { from: accounts[2] });

    assert.equal(tx.logs.length, 2);
    assert.equal(tx.logs[1].event, "ExecuteProposal");
    assert.equal(tx.logs[1].args._proposalId, proposalId);
    assert.equal(tx.logs[1].args._decision, 2);
    assert.equal(tx.logs[1].args._executionState, 2);
  });

  it("should log the ExecuteProposal event after time pass for preBoostedVotePeriodLimit (decision == 2 )", async function() {
    var testSetup = await setup(accounts,50,2);
    let tx = await testSetup.genesisProtocol.propose(2, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
    const proposalId = await getValueFromLogs(tx, '_proposalId');
    assert.isOk(proposalId);

    // now lets vote with a minority reputation
    await testSetup.genesisProtocol.vote(proposalId, 1);
    await helpers.increaseTime(3);
    // the decisive vote is cast now and the proposal will be executed
    tx = await testSetup.genesisProtocol.vote(proposalId, 1, { from: accounts[2] });
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "ExecuteProposal");
    assert.equal(tx.logs[0].args._proposalId, proposalId);
    assert.equal(tx.logs[0].args._decision, 2);
    assert.equal(tx.logs[0].args._executionState, 1);
  });

  it("All options can be voted (1-2)", async function() {
    var testSetup = await setup(accounts);
    let tx = await testSetup.genesisProtocol.propose(2, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
    var proposalId = await getValueFromLogs(tx, '_proposalId');
    assert.isOk(proposalId);
    // Option 1
    await testSetup.genesisProtocol.vote(proposalId, 1);
    await checkVoteInfo(proposalId, accounts[0], [1, testSetup.reputationArray[0]],testSetup.genesisProtocol);
    await checkVotesStatus(proposalId, [0,testSetup.reputationArray[0], 0],testSetup.genesisProtocol);
    await checkIsVotable(proposalId,true,testSetup.genesisProtocol);


    testSetup = await setup(accounts);
    tx = await testSetup.genesisProtocol.propose(2, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
    proposalId = await getValueFromLogs(tx, '_proposalId');
    assert.isOk(proposalId);
    // Option 2
    await testSetup.genesisProtocol.vote(proposalId, 2);
    await checkVoteInfo(proposalId, accounts[0], [2, testSetup.reputationArray[0]],testSetup.genesisProtocol);
    await checkVotesStatus(proposalId, [0,0, testSetup.reputationArray[0]],testSetup.genesisProtocol);
    await checkIsVotable(proposalId,true,testSetup.genesisProtocol);
  });

  it("cannot re vote", async function() {
    var testSetup = await setup(accounts);
    let tx = await testSetup.genesisProtocol.propose(2, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
    var proposalId = await getValueFromLogs(tx, '_proposalId');
    assert.isOk(proposalId);
    await testSetup.genesisProtocol.vote(proposalId, 2);
    await checkVoteInfo(proposalId, accounts[0], [2, testSetup.reputationArray[0]],testSetup.genesisProtocol);
    await checkVotesStatus(proposalId, [0,0,testSetup.reputationArray[0]],testSetup.genesisProtocol);
    await checkIsVotable(proposalId,true,testSetup.genesisProtocol);

    await testSetup.genesisProtocol.vote(proposalId, 1);
    await checkVoteInfo(proposalId, accounts[0], [2, testSetup.reputationArray[0]],testSetup.genesisProtocol);
    await checkVotesStatus(proposalId, [0,0,testSetup.reputationArray[0]],testSetup.genesisProtocol);
    await checkIsVotable(proposalId,true,testSetup.genesisProtocol);
  });



  it("Non-existent parameters hash shouldn't work", async function() {
    var testSetup = await setup(accounts);
    await testSetup.genesisProtocol.propose(2, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);

    var paramsHash = await testSetup.genesisProtocol.getParametersHash([50,0,0,0,0,0,0,0,0,0,0,0],helpers.NULL_ADDRESS);
    try {
      await testSetup.genesisProtocol.propose(2, paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
      assert(false, "propose was supposed to throw but didn't.");
    } catch(error) {
      helpers.assertVMException(error);
    }

    paramsHash = await testSetup.genesisProtocol.getParametersHash([50,0,0,0,0,0,0,0,0,0,0,0],helpers.SOME_ADDRESS);
    try {
      await testSetup.genesisProtocol.propose(2, paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
      assert(false, "propose was supposed to throw but didn't.");
    } catch(error) {
      helpers.assertVMException(error);
    }

    paramsHash = await testSetup.genesisProtocol.getParametersHash([50,0,0,0,0,0,0,0,0,0,0,0],helpers.SOME_ADDRESS);
    try {
      await testSetup.genesisProtocol.propose(2, paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
      assert(false, "propose was supposed to throw but didn't.");
    } catch(error) {
      helpers.assertVMException(error);
    }
  });

  it("Invalid percentage required( < 0 || > 100) shouldn't work", async function() {
    try {
      await setup(accounts,150);
      assert(false, "setParameters was supposed to throw but didn't.");
    } catch(error) {
      helpers.assertVMException(error);
    }

    try {
      await setup(accounts,-50);
      assert(false, "setParameters was supposed to throw but didn't.");
    } catch(error) {
      helpers.assertVMException(error);
    }
  });

  it("Proposal voting  shouldn't be able after proposal has been executed", async function () {
    var testSetup = await setup(accounts);
    let tx = await testSetup.genesisProtocol.propose(2, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
    var proposalId = await getValueFromLogs(tx, '_proposalId');
    assert.isOk(proposalId);

    // After this voting the proposal should be executed
    await testSetup.genesisProtocol.vote(proposalId, 2, {from: accounts[2]});

    // Should not be able to vote because the proposal has been executed
    try {
        await testSetup.genesisProtocol.vote(proposalId, 1, { from: accounts[1] });
        assert(false, "vote was supposed to throw but didn't.");
    } catch (error) {
        helpers.assertVMException(error);
    }

  });

  it("the vote function should behave as expected", async function () {
    var testSetup = await setup(accounts);
    let tx = await testSetup.genesisProtocol.propose(2, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
    var proposalId = await getValueFromLogs(tx, '_proposalId');
    assert.isOk(proposalId);

    // no one has voted yet at this point
    var submittedTime = await  web3.eth.getBlock("latest").timestamp;
    var state = 2;
    var winningVote = 2;
    await checkProposalInfo(proposalId, [testSetup.org.avatar.address, 2, testSetup.executable.address, 0, 0,0,0,submittedTime,0,state,winningVote,accounts[0],60],testSetup.genesisProtocol);

    // lets try to vote by the owner on the behalf of non-existent voters(they do exist but they aren't registered to the reputation system).
    for (var i = 3; i < accounts.length; i++) {
        await testSetup.genesisProtocol.vote(proposalId, 1,{ from: accounts[i] });
    }
    // everything should be 0
    await checkVotesStatus(proposalId, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],testSetup.genesisProtocol);

  });

  it("Should behave sensibly without an executable ", async function () {

    var testSetup = await setup(accounts);
    try {
        await testSetup.genesisProtocol.propose(2, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, helpers.NULL_ADDRESS,accounts[0]);
        assert(false, 'Should throw an exception because no executable is null');
      } catch (ex) {
          helpers.assertVMException(ex);
    }

  });

  it('Proposal with wrong num of options', async function () {
      var testSetup = await setup(accounts);

    // 3 options - max is 2 - exception should be raised
    try {
      await testSetup.genesisProtocol.propose(3, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
      assert(false, 'Tried to create a proposal with 3 options - max is 2');
    } catch (ex) {
      helpers.assertVMException(ex);
    }

    // -5 options - exception should be raised
    try {
      await testSetup.genesisProtocol.propose(-5, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
      assert(false, 'Tried to create an absolute vote with negative number of options');
    } catch (ex) {
      helpers.assertVMException(ex);
    }

    // 0 options - exception should be raised
    try {
      await testSetup.genesisProtocol.propose(0, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
      assert(false, 'Tried to create an absolute vote with 0 number of options');
    } catch (ex) {
      helpers.assertVMException(ex);
    }
  });

  it('Test voteWithSpecifiedAmounts - More reputation than I own, negative reputation, etc..', async function () {
      var testSetup = await setup(accounts);
      let tx = await testSetup.genesisProtocol.propose(2, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
      var proposalId = await getValueFromLogs(tx, '_proposalId');
      assert.isOk(proposalId);

    // Vote with the reputation the I own - should work
    await testSetup.genesisProtocol.voteWithSpecifiedAmounts(proposalId, 1, testSetup.reputationArray[0], 0);

    // Vote with more reputation that i own - exception should be raised
    try {
      await testSetup.genesisProtocol.voteWithSpecifiedAmounts(proposalId, 1, (testSetup.reputationArray[1] + 1), 0,{from:accounts[1]});
      assert(false, 'Not enough reputation - voting shouldn\'t work');
    } catch (ex) {
      helpers.assertVMException(ex);
    }

    // Vote with a very big number - exception should be raised
    let BigNumber = require('bignumber.js');
    let bigNum = ((new BigNumber(2)).toPower(254));
    try {
      await testSetup.genesisProtocol.voteWithSpecifiedAmounts(proposalId, 1, bigNum, 0);
      assert(false, 'Voting shouldn\'t work');
    } catch (ex) {
      helpers.assertVMException(ex);
    }
  });

  it("Internal functions can not be called externally", async () => {

    var testSetup = await setup(accounts);
    let tx = await testSetup.genesisProtocol.propose(2, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
    var proposalId = await getValueFromLogs(tx, '_proposalId');
    assert.isOk(proposalId);

    // Lets try to call internalVote function
    try {
      await testSetup.genesisProtocol.internalVote(proposalId, accounts[0], 1, testSetup.reputationArray[0]);
      assert(false, 'Can\'t call internalVote');
    } catch (ex) {
      helpers.assertInternalFunctionException(ex);
    }
  });

  it("Try to send wrong proposal id to the voting/cancel functions", async () => {

    var testSetup = await setup(accounts);
    let tx = await testSetup.genesisProtocol.propose(2, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
    var proposalId = await getValueFromLogs(tx, '_proposalId');
    assert.isOk(proposalId);

    // Lets try to call vote with invalid proposal id
    try {
      await testSetup.genesisProtocol.vote('asdsada', 1, {from: accounts[0]});
      assert(false, 'Invalid proposal ID has been delivered');
    } catch (ex) {
      helpers.assertVMException(ex);
    }

    // Lets try to call voteWithSpecifiedAmounts with invalid proposal id
    try {
      await testSetup.genesisProtocol.voteWithSpecifiedAmounts('asdsada', 1, 1, 1);
      assert(false, 'Invalid proposal ID has been delivered');
    } catch (ex) {
      helpers.assertVMException(ex);
    }

    // Lets try to call execute with invalid proposal id
    try {
      await testSetup.genesisProtocol.execute('asdsada');
      assert(false, 'Invalid proposal ID has been delivered');
    } catch (ex) {
      helpers.assertVMException(ex);
    }
  });

  it("stake log", async () => {

    var testSetup = await setup(accounts);
    let tx = await testSetup.genesisProtocol.propose(2, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
    var proposalId = await getValueFromLogs(tx, '_proposalId');
    assert.isOk(proposalId);
    await testSetup.standardTokenMock.approve(testSetup.genesisProtocol.address,10);

    tx = await testSetup.genesisProtocol.stake(proposalId,1,10);
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "Stake");
    assert.equal(tx.logs[0].args._voter, accounts[0]);
    assert.equal(tx.logs[0].args._vote, 1);
    assert.equal(tx.logs[0].args._amount, 10);
  });

  it("stake without approval - fail", async () => {

    var testSetup = await setup(accounts);
    let tx = await testSetup.genesisProtocol.propose(2, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
    var proposalId = await getValueFromLogs(tx, '_proposalId');
    assert.isOk(proposalId);

      try {
        await testSetup.genesisProtocol.stake(proposalId,2,10);
        assert(false, 'stake without approval should revert');
      } catch (ex) {
        helpers.assertVMException(ex);
      }
  });


  it("stake with zero amount will fail", async () => {

    var testSetup = await setup(accounts);
    let tx = await testSetup.genesisProtocol.propose(2, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
    var proposalId = await getValueFromLogs(tx, '_proposalId');
    assert.isOk(proposalId);
    await testSetup.standardTokenMock.approve(testSetup.genesisProtocol.address,10);

    try {
      await testSetup.genesisProtocol.stake(proposalId,1,0);
      assert(false, 'stake with zero amount should revert');
    } catch (ex) {
      helpers.assertVMException(ex);
    }

  });

  it("stake on boosted proposal is not allowed", async () => {

    var testSetup = await setup(accounts);
    let tx = await testSetup.genesisProtocol.propose(2, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
    var proposalId = await getValueFromLogs(tx, '_proposalId');
    assert.isOk(proposalId);
    await testSetup.standardTokenMock.approve(testSetup.genesisProtocol.address,100);
    //shift proposal to boosted phase
    var proposalInfo = await testSetup.genesisProtocol.proposals(proposalId);
    assert.equal(proposalInfo[4],0);
    assert.equal(proposalInfo[9],2);
    await testSetup.genesisProtocol.vote(proposalId,1);

    assert.equal(await testSetup.genesisProtocol.shouldBoost(proposalId),false);
    await testSetup.genesisProtocol.stake(proposalId,1,100);
    proposalInfo = await testSetup.genesisProtocol.proposals(proposalId);

    assert.equal(proposalInfo[5],1);  //voterStakes
    assert.equal(proposalInfo[4],99); //totalStakes
    assert.equal(proposalInfo[9],3);  //state boosted

    assert.equal(await testSetup.genesisProtocol.shouldBoost(proposalId),true);
    //S = (S+) - (S-)
    var score = 100;
    assert.equal(await testSetup.genesisProtocol.score(proposalId),score);

    //try to stake on boosted proposal should fail
    tx = await testSetup.genesisProtocol.stake(proposalId,1,10);
    assert.equal(tx.logs.length, 0);
  });

  it("stake on boosted dual proposal is not allowed", async () => {

    var testSetup = await setup(accounts);
    let tx = await testSetup.genesisProtocol.propose(2, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
    var proposalId = await getValueFromLogs(tx, '_proposalId');
    assert.isOk(proposalId);
    await testSetup.standardTokenMock.approve(testSetup.genesisProtocol.address,100);
    //shift proposal to boosted phase
    var proposalInfo = await testSetup.genesisProtocol.proposals(proposalId);
    assert.equal(proposalInfo[4],0);
    assert.equal(proposalInfo[9],2);
    await testSetup.genesisProtocol.vote(proposalId,1);

    assert.equal(await testSetup.genesisProtocol.shouldBoost(proposalId),false);
    await testSetup.genesisProtocol.stake(proposalId,1,100);
    proposalInfo = await testSetup.genesisProtocol.proposals(proposalId);

    assert.equal(proposalInfo[5],1);  //voterStakes
    assert.equal(proposalInfo[4],99); //totalStakes
    assert.equal(proposalInfo[9],3);   //state boosted

    assert.equal(await testSetup.genesisProtocol.shouldBoost(proposalId),true);
    //S* POW(R/totalR)
    var score = 100;
    assert.equal(await testSetup.genesisProtocol.score(proposalId),score);

    //try to stake on boosted proposal should fail
    tx = await testSetup.genesisProtocol.stake(proposalId,1,10);
    assert.equal(tx.logs.length, 0);
  });

  it("shouldBoost ", async () => {

    var testSetup = await setup(accounts);
    let tx = await testSetup.genesisProtocol.propose(2, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
    var proposalId = await getValueFromLogs(tx, '_proposalId');
    assert.isOk(proposalId);
    await testSetup.standardTokenMock.approve(testSetup.genesisProtocol.address,100);

    var proposalInfo = await testSetup.genesisProtocol.proposals(proposalId);

    await testSetup.genesisProtocol.vote(proposalId,1);

    assert.equal(await testSetup.genesisProtocol.shouldBoost(proposalId),false);
    assert.equal(await testSetup.genesisProtocol.score(proposalId),0);
    await testSetup.genesisProtocol.stake(proposalId,1,100);
    proposalInfo = await testSetup.genesisProtocol.proposals(proposalId);

    assert.equal(proposalInfo[5],1);  //voterStakes
    assert.equal(proposalInfo[4],99); //totalStakes
    assert.equal(proposalInfo[9],3);   //state boosted

    assert.equal(await testSetup.genesisProtocol.shouldBoost(proposalId),true);
    var score = 100;
    assert.equal(await testSetup.genesisProtocol.score(proposalId),score);

  });

  it("shouldBoost dual proposal   ", async () => {

    var testSetup = await setup(accounts);
    let tx = await testSetup.genesisProtocol.propose(2, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
    var proposalId = await getValueFromLogs(tx, '_proposalId');
    assert.isOk(proposalId);
    await testSetup.standardTokenMock.approve(testSetup.genesisProtocol.address,100);

    var proposalInfo = await testSetup.genesisProtocol.proposals(proposalId);

    await testSetup.genesisProtocol.vote(proposalId,1);

    assert.equal(await testSetup.genesisProtocol.shouldBoost(proposalId),false);
    assert.equal(await testSetup.genesisProtocol.score(proposalId),0);
    await testSetup.genesisProtocol.stake(proposalId,1,100);
    proposalInfo = await testSetup.genesisProtocol.proposals(proposalId);

    assert.equal(proposalInfo[5],1);  //voterStakes
    assert.equal(proposalInfo[4],99); //totalStakes
    assert.equal(proposalInfo[9],3);   //state boosted

    assert.equal(await testSetup.genesisProtocol.shouldBoost(proposalId),true);
    var score = 100;
    assert.equal(await testSetup.genesisProtocol.score(proposalId),score);
  });

  it("proposal score ", async () => {

    var testSetup = await setup(accounts);
    let tx = await testSetup.genesisProtocol.propose(2, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
    var proposalId = await getValueFromLogs(tx, '_proposalId');
    assert.isOk(proposalId);
    await testSetup.standardTokenMock.approve(testSetup.genesisProtocol.address,100);

    var proposalInfo = await testSetup.genesisProtocol.proposals(proposalId);

    await testSetup.genesisProtocol.vote(proposalId,1);

    assert.equal(await testSetup.genesisProtocol.shouldBoost(proposalId),false);
    await testSetup.genesisProtocol.stake(proposalId,1,100);
    proposalInfo = await testSetup.genesisProtocol.proposals(proposalId);

    assert.equal(proposalInfo[5],1);  //voterStakes
    assert.equal(proposalInfo[4],99); //totalStakes
    assert.equal(proposalInfo[9],3);   //state
    assert.equal(await testSetup.genesisProtocol.shouldBoost(proposalId),true);
  });

  it("stake on none votable phase should revert ", async () => {

    var testSetup = await setup(accounts);
    let tx = await testSetup.genesisProtocol.propose(2, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
    var proposalId = await getValueFromLogs(tx, '_proposalId');
    assert.isOk(proposalId);
    await testSetup.standardTokenMock.approve(testSetup.genesisProtocol.address,10);
    //vote with majority. state is executed
    await testSetup.genesisProtocol.vote(proposalId, 1, { from: accounts[2] });

    try {
      await testSetup.genesisProtocol.stake(proposalId,1,10);
      assert(false, 'stake on executed phase should revert');
    } catch (ex) {
      helpers.assertVMException(ex);
    }

  });

  it("threshold ", async () => {

    var testSetup = await setup(accounts);
    assert.equal(await testSetup.genesisProtocol.threshold(testSetup.org.avatar.address),1);

  });

  it("redeem ", async () => {

    var testSetup = await setup(accounts);
    let tx = await testSetup.genesisProtocol.propose(2, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
    var proposalId = await getValueFromLogs(tx, '_proposalId');
    assert.isOk(proposalId);
    await testSetup.standardTokenMock.approve(testSetup.genesisProtocol.address,100);
    await testSetup.genesisProtocol.vote(proposalId,1);
    assert.equal(await testSetup.genesisProtocol.shouldBoost(proposalId),false);
    await testSetup.genesisProtocol.stake(proposalId,1,100);
    assert.equal(await testSetup.genesisProtocol.shouldBoost(proposalId),true);
    await helpers.increaseTime(61);
    await testSetup.genesisProtocol.execute(proposalId);
    var redeemAmount = await testSetup.genesisProtocol.getRedeemableTokensStaker(proposalId,accounts[0]);
    assert.equal(redeemAmount,((99*99)/99));
    assert.equal(await testSetup.standardTokenMock.balanceOf(accounts[0]),900);
    tx = await testSetup.genesisProtocol.redeem(proposalId,accounts[0]);
    assert.equal(tx.logs.length,2);
    assert.equal(tx.logs[0].event, "Redeem");
    assert.equal(tx.logs[0].args._proposalId, proposalId);
    assert.equal(tx.logs[0].args._beneficiary, accounts[0]);
    assert.equal(tx.logs[0].args._amount, 100);
    assert.equal(await testSetup.standardTokenMock.balanceOf(accounts[0]),1000);
  });

  it("redeem without execution should revert", async () => {

    var testSetup = await setup(accounts);
    let tx = await testSetup.genesisProtocol.propose(2, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
    var proposalId = await getValueFromLogs(tx, '_proposalId');
    assert.isOk(proposalId);
    await testSetup.standardTokenMock.approve(testSetup.genesisProtocol.address,100);
    await testSetup.genesisProtocol.vote(proposalId,1);
    assert.equal(await testSetup.genesisProtocol.shouldBoost(proposalId),false);
    await testSetup.genesisProtocol.stake(proposalId,1,100);
    assert.equal(await testSetup.genesisProtocol.shouldBoost(proposalId),true);
    await testSetup.genesisProtocol.execute(proposalId);
    try {
      await  testSetup.genesisProtocol.redeem(proposalId,accounts[0]);
      assert(false, 'redeem before execution should revert');
    } catch (ex) {
      helpers.assertVMException(ex);
    }
  });

    it("genesisProtocolFormulasInterface ", async () => {

      var genesisProtocolFormulasMock = await GenesisProtocolFormulasMock.new();
      // _preBoostedVoteRequiredPercentage=50,
      // _preBoostedVotePeriodLimit=60,
      // _boostedVotePeriodLimit=60,
      // _thresholdConstA=1,
      // _thresholdConstB=1,
      // _minimumStakingFee=0,
      // _quietEndingPeriod=0,
      // _proposingRepRewardConstA=60,
      // _proposingRepRewardConstB=1,
      // _stakerFeeRatioForVoters=1,
      // _votersReputationLossRatio=0,
      // _votersGainRepRatioFromLostRep=0,
      // _governanceFormulasInterface=0
      var testSetup = await setup(accounts,50,60,60,1,1,0,0,60,1,1,0,0,genesisProtocolFormulasMock.address);
      let tx = await testSetup.genesisProtocol.propose(2, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
      var proposalId = await getValueFromLogs(tx, '_proposalId');
      assert.isOk(proposalId);
      await testSetup.standardTokenMock.approve(testSetup.genesisProtocol.address,100);
      var proposalInfo = await testSetup.genesisProtocol.proposals(proposalId);
      await testSetup.genesisProtocol.vote(proposalId,1);
      assert.equal(await testSetup.genesisProtocol.shouldBoost(proposalId),false);
      assert.equal(await testSetup.genesisProtocol.score(proposalId),0);
      await testSetup.genesisProtocol.stake(proposalId,1,100);
      proposalInfo = await testSetup.genesisProtocol.proposals(proposalId);
      assert.equal(proposalInfo[5],1);  //voterStakes
      assert.equal(proposalInfo[4],99); //totalStakes
      assert.equal(proposalInfo[9],3);   //state
      assert.equal(await testSetup.genesisProtocol.shouldBoost(proposalId),true);
      var score = 100;
      assert.equal(await testSetup.genesisProtocol.score(proposalId),score);
      await helpers.increaseTime(61);
      await testSetup.genesisProtocol.execute(proposalId);
      var redeemAmount = await testSetup.genesisProtocol.getRedeemableTokensStaker(proposalId,accounts[0]);
      assert.equal(redeemAmount,((99*99)/99));
    });

    it("dynamic threshold ", async () => {
      var testSetup = await setup(accounts);
      await testSetup.standardTokenMock.approve(testSetup.genesisProtocol.address,1000);
      let tx = await testSetup.genesisProtocol.propose(2, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
      var proposalId = await getValueFromLogs(tx, '_proposalId');
      assert.equal(await testSetup.genesisProtocol.threshold(testSetup.org.avatar.address),1);
      assert.equal(await testSetup.genesisProtocol.orgBoostedProposalsCnt(testSetup.org.avatar.address),0);
      await testSetup.genesisProtocol.vote(proposalId,1);
      await testSetup.genesisProtocol.stake(proposalId,1,100);
      assert.equal(await testSetup.genesisProtocol.shouldBoost(proposalId),true);
      assert.equal(await testSetup.genesisProtocol.state(proposalId),3);
      assert.equal(await testSetup.genesisProtocol.orgBoostedProposalsCnt(testSetup.org.avatar.address),1);
      assert.equal(await testSetup.genesisProtocol.threshold(testSetup.org.avatar.address),2);
      //set up another proposal
      tx = await testSetup.genesisProtocol.propose(2, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
      proposalId = await getValueFromLogs(tx, '_proposalId');
      //boost it
      await testSetup.genesisProtocol.vote(proposalId,1);
      await testSetup.genesisProtocol.stake(proposalId,1,100);
      assert.equal(await testSetup.genesisProtocol.state(proposalId),3);
      assert.equal(await testSetup.genesisProtocol.orgBoostedProposalsCnt(testSetup.org.avatar.address),2);
      assert.equal(await testSetup.genesisProtocol.threshold(testSetup.org.avatar.address),4);

      //execute
      await helpers.increaseTime(61);
      await testSetup.genesisProtocol.execute(proposalId);
      assert.equal(await testSetup.genesisProtocol.orgBoostedProposalsCnt(testSetup.org.avatar.address),1);
      assert.equal(await testSetup.genesisProtocol.threshold(testSetup.org.avatar.address),2);
    });

    it("reputation flow ", async () => {
      var testSetup = await setup(accounts);
      let tx = await testSetup.genesisProtocol.propose(2, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
      var proposalId = await getValueFromLogs(tx, '_proposalId');
      assert.isOk(proposalId);
      await testSetup.standardTokenMock.approve(testSetup.genesisProtocol.address,100);
      await testSetup.genesisProtocol.vote(proposalId,1);
      assert.equal(await testSetup.genesisProtocol.shouldBoost(proposalId),false);
      await testSetup.genesisProtocol.stake(proposalId,1,100);
      assert.equal(await testSetup.genesisProtocol.shouldBoost(proposalId),true);
      await helpers.increaseTime(61);
      await testSetup.genesisProtocol.execute(proposalId);
      var redeemAmount = await testSetup.genesisProtocol.getRedeemableTokensStaker(proposalId,accounts[0]);
      assert.equal(redeemAmount,((99*99)/99));
      assert.equal(await testSetup.standardTokenMock.balanceOf(accounts[0]),900);

      //20% of the lost reputation
      var rep4Stake = await testSetup.genesisProtocol.getRedeemableReputationStaker(proposalId,accounts[0]);
      assert.equal(rep4Stake,0);
      //80% of the lost reputation + the votersReputationLossRatio.
      var rep4Vote = await testSetup.genesisProtocol.getRedeemableReputationVoter(proposalId,accounts[0]);
      assert.equal(rep4Vote,3);
      var rep4Propose = await testSetup.genesisProtocol.getRedeemableReputationProposer(proposalId);
      //proposingRepRewardConstA + proposingRepRewardConstB* (votes[1]-proposal.votes[0]) = 60 + 1*(20-0)
      assert.equal(rep4Propose,80);
      tx = await testSetup.genesisProtocol.redeem(proposalId,accounts[0]);
      assert.equal(tx.logs.length, 2);
      assert.equal(tx.logs[0].event, "Redeem");
      assert.equal(tx.logs[0].args._proposalId, proposalId);
      assert.equal(tx.logs[0].args._beneficiary, accounts[0]);
      assert.equal(tx.logs[0].args._amount, 100);

      assert.equal(tx.logs[1].event, "RedeemReputation");
      assert.equal(tx.logs[1].args._proposalId, proposalId);
      assert.equal(tx.logs[1].args._beneficiary, accounts[0]);
      var totalRep =  rep4Stake.toNumber() + rep4Vote.toNumber() + rep4Propose.toNumber();
      assert.equal(tx.logs[1].args._amount, totalRep);

      assert.equal(await testSetup.standardTokenMock.balanceOf(accounts[0]),1000);
      var loss = (10*testSetup.reputationArray[0])/100;  //votersReputationLossRatio
      assert.equal(await testSetup.org.reputation.reputationOf(accounts[0]),testSetup.reputationArray[0] + totalRep - loss);
    });

    it("reputation flow for unsuccessful voting", async () => {
      var testSetup = await setup(accounts);
      let tx = await testSetup.genesisProtocol.propose(2, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
      var proposalId = await getValueFromLogs(tx, '_proposalId');
      assert.isOk(proposalId);
      await testSetup.standardTokenMock.approve(testSetup.genesisProtocol.address,100);
      await testSetup.genesisProtocol.vote(proposalId,1);
      assert.equal(await testSetup.genesisProtocol.shouldBoost(proposalId),false);

      await helpers.increaseTime(61);
      await testSetup.genesisProtocol.execute(proposalId);
      var redeemAmount = await testSetup.genesisProtocol.getRedeemableTokensStaker(proposalId , accounts[0]);
      assert.equal(redeemAmount,0);

      //20% of the lost reputation
      var rep4Stake = await testSetup.genesisProtocol.getRedeemableReputationStaker(proposalId,accounts[0]);
      assert.equal(rep4Stake,0);
      // the votersReputationLossRatio.
      var rep4Vote = await testSetup.genesisProtocol.getRedeemableReputationVoter(proposalId,accounts[0]);
      assert.equal(rep4Vote,2);
      var rep4Propose = await testSetup.genesisProtocol.getRedeemableReputationProposer(proposalId);
      //for unsuccessful proposal it should be 0
      assert.equal(rep4Propose,0);
      tx = await testSetup.genesisProtocol.redeem(proposalId,accounts[0]);
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "RedeemReputation");
      assert.equal(tx.logs[0].args._proposalId, proposalId);
      assert.equal(tx.logs[0].args._beneficiary, accounts[0]);
      var totalRep =  rep4Stake.toNumber() + rep4Vote.toNumber() + rep4Propose.toNumber();
      assert.equal(tx.logs[0].args._amount, totalRep);
      assert.equal(await testSetup.standardTokenMock.balanceOf(accounts[0]),1000);
      var loss = (10*testSetup.reputationArray[0])/100;  //votersReputationLossRatio
      assert.equal(await testSetup.org.reputation.reputationOf(accounts[0]),testSetup.reputationArray[0] + totalRep - loss);
    });

    it("quite window ", async () => {
      var quietEndingPeriod = 20;
      var testSetup = await setup(accounts,50,60,60,1,1,0,quietEndingPeriod,60,1,1,0,0,0);
      let tx = await testSetup.genesisProtocol.propose(2, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
      var proposalId = await getValueFromLogs(tx, '_proposalId');
      assert.isOk(proposalId);
      await testSetup.standardTokenMock.approve(testSetup.genesisProtocol.address,100);
      await testSetup.genesisProtocol.vote(proposalId,1,{from:accounts[1]});
      assert.equal(await testSetup.genesisProtocol.shouldBoost(proposalId),false);
      await testSetup.genesisProtocol.stake(proposalId,1,100);
      assert.equal(await testSetup.genesisProtocol.shouldBoost(proposalId),true);
      var proposalInfo = await testSetup.genesisProtocol.proposals(proposalId);
      assert.equal(proposalInfo[9],3);//boosted

      await helpers.increaseTime(50); //get into the quite period
      await testSetup.genesisProtocol.vote(proposalId,2,{from:accounts[0]}); //change winning vote
      proposalInfo = await testSetup.genesisProtocol.proposals(proposalId);
      assert.equal(proposalInfo[9],4);//quietEndingPeriod -still not execute
      await helpers.increaseTime(15); //increase time
      await testSetup.genesisProtocol.execute(proposalId);
      proposalInfo = await testSetup.genesisProtocol.proposals(proposalId);
      assert.equal(proposalInfo[9],4);//boosted -still not execute
      await helpers.increaseTime(10); //increase time
      await testSetup.genesisProtocol.execute(proposalId);
      proposalInfo = await testSetup.genesisProtocol.proposals(proposalId);
      assert.equal(proposalInfo[9],1);//boosted -still not execute
    });

    it("scoreThresholdParams and proposalAvatar", async () => {

      var scoreThresholdParamsA = 8;
      var scoreThresholdParamsB = 9;

      var testSetup = await setup(accounts,50,60,60,scoreThresholdParamsA,scoreThresholdParamsB,0,20,60,1,1,0,0,0);

      var scoreThresholdParams = await testSetup.genesisProtocol.scoreThresholdParams(testSetup.org.avatar.address);

      assert.equal(scoreThresholdParams[0],scoreThresholdParamsA);
      assert.equal(scoreThresholdParams[1],scoreThresholdParamsB);


      let tx = await testSetup.genesisProtocol.propose(2, testSetup.genesisProtocolParams.paramsHash, testSetup.org.avatar.address, testSetup.executable.address,accounts[0]);
      var proposalId = await getValueFromLogs(tx, '_proposalId');
      assert.isOk(proposalId);
      assert.equal(await testSetup.genesisProtocol.proposalAvatar(proposalId),testSetup.org.avatar.address);
    });
});
