circular.use('bus', function EventEmitter() {
  var nextId = 0;
  var subs = {};

  function sub(channel, callback, context) {
    if (!subs[channel]) {
      subs[channel] = [];
    }
    var sub = {
      id: nextId,
      channel: channel,
      callback: callback,
      context: null
    };
    if (context) {
      sub.context = context;
    }
    ++nextId;
    subs[channel].push(sub);
    return sub;
  }

  function unsub(sub) {
    if (!subs[sub.channel]) {
      return;
    }
    var channelSubs = subs[sub.channel];
    for (var i in channelSubs) {
      if (channelSubs[i].id == sub.id) {
        channelSubs.splice(i, 1);
        if (channelSubs.length == 0) {
          delete subs[channel];
        }
        return;
      }
    }
  }

  function pub(channel) {
    if (!subs[channel]) {
      return;
    }
    var args = Array.prototype.slice.call(arguments, 1);
    var channelSubs = subs[channel];
    var sub;
    for (var i in channelSubs) {
      sub = channelSubs[i];
      sub.callback.apply(sub.context, args);
    }
  }

  return {
    sub: sub,
    unsub: unsub,
    pub: pub
  };
});
