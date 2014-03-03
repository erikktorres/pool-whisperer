/*
 * == BSD2 LICENSE ==
 */

var dataHelpers = require('../../lib/tidepool/dataHelpers.js');
var rx = require('rx');

var expect = require('salinity').expect;

describe('dataHelpers', function(){
  describe('convertBolus', function(){
    it('combines boluses', function(done){
      var obs = rx.Observable.fromArray(
        [{
           _id: 'abcd', deviceTime: "2014-01-01T01:00:00", value: 3.6,
           type: "bolus", subType: "dual/normal", groupId: "myJoinKey"
         },
         {
           _id: 'abcde', deviceTime: "2014-01-01T01:00:00Z", value: 1.7,
           type: "bolus", subType: "dual/square", groupId: "myJoinKey",
           duration: 14400000
         },
         {
           _id: '1234', deviceTime: "2014-01-01T01:00:00", value: 0.1,
           type: "bolus", subType: "dual/normal", groupId: "yourJoinKey"
         },
         {
           _id: '12345', deviceTime: "2014-01-01T01:00:00Z", value: 1.7,
           type: "bolus", subType: "dual/square", groupId: "yourJoinKey",
           duration: 14400000
         }]
      );

      dataHelpers.convertBolus(obs).toArray().subscribe(
        function(converted) {
          expect(converted).deep.equals(
            [{
               _id: "abcd", deviceTime: "2014-01-01T01:00:00", value: 5.3,
               type: "bolus",
               duration: 14400000,
               extended: true, initialDelivery: 3.6, extendedDelivery: 1.7
             },
             {
               _id: "1234", deviceTime: "2014-01-01T01:00:00", value: 1.8,
               type: "bolus",
               duration: 14400000,
               extended: true, initialDelivery: 0.1, extendedDelivery: 1.7
             }]
          );
          done();
        }
      );
    });

    it('fails if it gets something with the same subType before completing its current bolus', function(done){
      var obs = rx.Observable.fromArray(
        [{
           _id: 'abcd', deviceTime: "2014-01-01T01:00:00", value: 3.6,
           type: "bolus", subType: "dual/normal", groupId: "myJoinKey"
         },
         {
           _id: '1234', deviceTime: "2014-01-01T01:00:00", value: 0.1,
           type: "bolus", subType: "dual/normal", groupId: "yourJoinKey"
         },
         {
           _id: 'abcde', deviceTime: "2014-01-01T01:00:00Z", value: 1.7,
           type: "bolus", subType: "dual/square", groupId: "myJoinKey",
           duration: 14400000
         },
         {
           _id: '12345', deviceTime: "2014-01-01T01:00:00Z", value: 1.7,
           type: "bolus", subType: "dual/square", groupId: "yourJoinKey",
           duration: 14400000
         }]
      );

      try {
        dataHelpers.convertBolus(obs).subscribe(
          function(e){
            done(new Error('onNext should never get called'));
          },
          function(err){
            expect(err).to.exist;
            done();
          },
          function(){
            done(new Error('onComplete should never get called'));
          }
        );
      } catch (err) {
        console.log(err);
      }
    });

    it('fails if it gets events with different joinKeys before completing its current bolus', function(done){
      var obs = rx.Observable.fromArray(
        [{
           _id: 'abcd', deviceTime: "2014-01-01T01:00:00", value: 3.6,
           type: "bolus", subType: "dual/normal", groupId: "myJoinKey"
         },
         {
           _id: '12345', deviceTime: "2014-01-01T01:00:00Z", value: 1.7,
           type: "bolus", subType: "dual/square", groupId: "yourJoinKey",
           duration: 14400000
         },
         {
           _id: '1234', deviceTime: "2014-01-01T01:00:00", value: 0.1,
           type: "bolus", subType: "dual/normal", groupId: "yourJoinKey"
         },
         {
           _id: 'abcde', deviceTime: "2014-01-01T01:00:00Z", value: 1.7,
           type: "bolus", subType: "dual/square", groupId: "myJoinKey",
           duration: 14400000
         }]
      );

      dataHelpers.convertBolus(obs).subscribe(
        function(e){
          done(new Error('onNext should never get called'));
        },
        function(err){
          expect(err).to.exist;
          done();
        },
        function(){
          done(new Error('onComplete should never get called'));
        }
      );
    });

    it('passes through incomplete bolus records when completed', function(done){
      var obs = rx.Observable.fromArray(
        [{
           _id: 'abcd', deviceTime: "2014-01-01T01:00:00", value: 3.6,
           type: "bolus", subType: "dual/normal", groupId: "myJoinKey"
         },
         {
           _id: 'abcde', deviceTime: "2014-01-01T01:00:00Z", value: 1.7,
           type: "bolus", subType: "dual/square", groupId: "myJoinKey",
           duration: 14400000
         },
         {
           _id: '1234', deviceTime: "2014-01-01T01:00:00", value: 0.1,
           type: "bolus", subType: "dual/normal", groupId: "yourJoinKey"
         }]
      );

      dataHelpers.convertBolus(obs).toArray().subscribe(
        function(converted) {
          expect(converted).deep.equals(
            [{
               _id: "abcd", deviceTime: "2014-01-01T01:00:00", value: 5.3,
               type: "bolus",
               duration: 14400000,
               extended: true, initialDelivery: 3.6, extendedDelivery: 1.7
             },
             {
               _id: '1234', deviceTime: "2014-01-01T01:00:00", value: 0.1,
               type: "bolus", subType: "dual/normal", groupId: "yourJoinKey"
             }]
          );
          done();
        }
      );
    });

    it('let\'s non-boluses pass through', function(done){
      var obs = rx.Observable.fromArray(
        [{
           _id: 'abcd', deviceTime: "2014-01-01T01:00:00", value: 3.6,
           type: "bolus", subType: "dual/normal", groupId: "myJoinKey"
         },
         { _id: 'billy', type: 'howdy-ho'},
         {
           _id: 'abcde', deviceTime: "2014-01-01T01:00:00Z", value: 1.7,
           type: "bolus", subType: "dual/square", groupId: "myJoinKey",
           duration: 14400000
         },
         { _id: 'sally', type: 'you\'re cute'},
         {
           _id: '1234', deviceTime: "2014-01-01T01:00:00", value: 0.1,
           type: "bolus", subType: "dual/normal", groupId: "yourJoinKey"
         },
         { _id: 'billy2', type: 'well, thank you.  Here\'s my number, call me maybe?'},
         { _id: 'sally2', type: 'Ok Maybe.  I\'m Sally'},
         {
           _id: '12345', deviceTime: "2014-01-01T01:00:00Z", value: 1.7,
           type: "bolus", subType: "dual/square", groupId: "yourJoinKey",
           duration: 14400000
         },
         { _id: 'billy3', type: 'Do you consider yourself a comedian?' }]
      );

      dataHelpers.convertBolus(obs).toArray().subscribe(
        function(converted) {
          expect(converted).deep.equals(
            [{
               _id: "abcd", deviceTime: "2014-01-01T01:00:00", value: 5.3,
               type: "bolus",
               duration: 14400000,
               extended: true, initialDelivery: 3.6, extendedDelivery: 1.7
             },
             { _id: 'billy', type: 'howdy-ho'},
             { _id: 'sally', type: 'you\'re cute'},
             {
               _id: "1234", deviceTime: "2014-01-01T01:00:00", value: 1.8,
               type: "bolus",
               duration: 14400000,
               extended: true, initialDelivery: 0.1, extendedDelivery: 1.7
             },
             { _id: 'billy2', type: 'well, thank you.  Here\'s my number, call me maybe?'},
             { _id: 'sally2', type: 'Ok Maybe.  I\'m Sally'},
             { _id: 'billy3', type: 'Do you consider yourself a comedian?' }]
          );
          done();
        }
      );
    });
  });

  describe('convertBasal', function(){
    it('combines basals', function(done){
      var obs = rx.Observable.fromArray(
        [{
           _id: 'abcd', type: "basal-rate-change", deliveryType: "scheduled",
           deviceTime: "2014-03-07T01:00:00", value: 0.65,
           scheduleName: 'night-shift'
         },
         {
           _id: 'abcde', type: "basal-rate-change", deliveryType: "temp",
           deviceTime: "2014-03-07T01:38:27", value: 1.7,
           duration: 3600000
         },
         {
           _id: 'abcdef', type: "basal-rate-change", deliveryType: "scheduled",
           deviceTime: "2014-03-07T04:00:00", value: 0.32,
           scheduleName: 'night-shift'
         },
         {
           _id: 'abcdefg', type: "basal-rate-change", deliveryType: "scheduled",
           deviceTime: "2014-03-07T12:00:00", value: 1.02,
           scheduleName: 'night-shift'
         }]
      );

      dataHelpers.convertBasal(obs).toArray().subscribe(
        function(converted) {
          expect(converted).deep.equals(
            [{
               _id: "abcd", type: "basal-rate-segment", deliveryType: "scheduled",
               start: "2014-03-07T01:00:00", end: "2014-03-07T04:00:00", value: 0.65,
               scheduleName: 'night-shift', interval: "2014-03-07T01:00:00/2014-03-07T04:00:00"
             },
             {
               _id: "abcde", type: "basal-rate-segment", deliveryType: "temp",
               start: "2014-03-07T01:38:27", end: "2014-03-07T02:38:27", value: 1.7,
               interval: "2014-03-07T01:38:27/2014-03-07T02:38:27"
             },
             {
               _id: "abcdef", type: "basal-rate-segment", deliveryType: "scheduled",
               start: "2014-03-07T04:00:00", end: "2014-03-07T12:00:00", value: 0.32,
               scheduleName: 'night-shift', interval: "2014-03-07T04:00:00/2014-03-07T12:00:00"
             },
             {
               _id: "abcdefg", type: "basal-rate-segment", deliveryType: "scheduled",
               start: "2014-03-07T12:00:00", end: null, value: 1.02,
               scheduleName: 'night-shift', interval: "2014-03-07T12:00:00/2014-03-07T12:00:00"
             }
            ]
          );
          done();
        }
      );
    });
  });
});