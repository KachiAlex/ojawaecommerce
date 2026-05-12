import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMessaging } from '../contexts/MessagingContext';
import firebaseService from '../services/firebaseService';
import MobileBottomSheet from './MobileBottomSheet';

const AdvancedMessaging = ({ isOpen, onClose, order, otherUserId }) => {
  const { currentUser } = useAuth();
  const { sendMessage } = useMessaging();
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showReactions, setShowReactions] = useState(false);
  const [typing, setTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const reactions = ['👍', '👎', '❤️', '😂', '😮', '😢', '😡', '🎉'];

  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(recordingIntervalRef.current);
    }

    return () => clearInterval(recordingIntervalRef.current);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await sendVoiceMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendVoiceMessage = async (audioBlob) => {
    try {
      const fileName = `voice_${Date.now()}.wav`;
      const downloadURL = await firebaseService.storage.uploadFile(audioBlob, `messages/${order.id}/${fileName}`);
      
      await sendMessage(order.id, downloadURL, 'voice', {
        fileName,
        duration: recordingTime,
        type: 'audio/wav'
      });
    } catch (error) {
      console.error('Error sending voice message:', error);
    }
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    
    // Send typing indicator
    if (!typing) {
      setTyping(true);
      // Send typing indicator to other user
      firebaseService.messaging.sendTypingIndicator(order.id, currentUser.uid, true);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
      firebaseService.messaging.sendTypingIndicator(order.id, currentUser.uid, false);
    }, 1000);
  };

  const sendReaction = async (reaction) => {
    try {
      await sendMessage(order.id, reaction, 'reaction');
      setShowReactions(false);
    } catch (error) {
      console.error('Error sending reaction:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      await sendMessage(order.id, message.trim());
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isMobile = window.innerWidth < 768;

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
            <span className="text-emerald-600 font-medium">V</span>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Vendor Chat</h3>
            <p className="text-sm text-gray-500">
              {otherUserTyping ? 'Typing...' : 'Online'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {/* Voice message example */}
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <button className="p-2 bg-emerald-100 text-emerald-600 rounded-full">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </button>
            <div className="flex-1 bg-white rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Voice message</span>
                <span className="text-xs text-gray-400">{formatTime(recordingTime)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Message Input */}
      <div className="p-4 bg-white border-t border-gray-200">
        {/* Reactions */}
        {showReactions && (
          <div className="mb-3 p-3 bg-gray-100 rounded-lg">
            <div className="flex flex-wrap gap-2">
              {reactions.map((reaction) => (
                <button
                  key={reaction}
                  onClick={() => sendReaction(reaction)}
                  className="text-2xl hover:bg-gray-200 rounded p-1"
                >
                  {reaction}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={sendMessage} className="flex items-center space-x-2">
          {/* Voice Recording Button */}
          <button
            type="button"
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className={`p-2 rounded-full transition-colors ${
              isRecording 
                ? 'bg-red-500 text-white' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </button>

          {/* Reactions Button */}
          <button
            type="button"
            onClick={() => setShowReactions(!showReactions)}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <span className="text-xl">😊</span>
          </button>

          {/* Message Input */}
          <input
            type="text"
            value={message}
            onChange={handleTyping}
            placeholder="Type a message..."
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!message.trim()}
            className="bg-emerald-600 text-white p-2 rounded-full hover:bg-emerald-700 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>

        {/* Recording Indicator */}
        {isRecording && (
          <div className="mt-2 flex items-center space-x-2 text-red-600">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm">Recording... {formatTime(recordingTime)}</span>
          </div>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <MobileBottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Advanced Chat"
        snapPoints={[0.8, 0.95]}
      >
        {content}
      </MobileBottomSheet>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative ml-auto h-full w-full max-w-md bg-white shadow-xl">
        {content}
      </div>
    </div>
  );
};

export default AdvancedMessaging;
