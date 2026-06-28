import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, isLoggedIn } from '../api'

interface Message {
  id: string
  sender: 'user' | 'meridian'
  text: string
  timestamp: Date
  channel?: 'text' | 'voice'
  structuredData?: {
    type: 'direction' | 'roadmap'
    title?: string
    subtitle?: string
    compatibility?: string
    description?: string
    steps?: string[]
    tags?: string[]
  }
}

interface Conversation {
  id: string
  title: string
  preview: string
  messages: Message[]
  lastActive: Date
}

interface ChatInterfaceProps {
  onLogout: () => void
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onLogout }) => {
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: 'conv-1',
      title: 'Product Design vs Engineering',
      preview: 'I am operate in the overlap between design and code...',
      lastActive: new Date(Date.now() - 3600000 * 2), // 2 hours ago
      messages: [
        {
          id: 'm1-1',
          sender: 'meridian',
          text: "Hi there! I'm Meridian. Let's figure out where you're headed. What kind of work are you doing right now?",
          timestamp: new Date(Date.now() - 3600000 * 2.2)
        },
        {
          id: 'm1-2',
          sender: 'user',
          text: "I'm a frontend engineer, but I find myself spending more time tweaking designs and thinking about the user experience.",
          timestamp: new Date(Date.now() - 3600000 * 2.1)
        },
        {
          id: 'm1-3',
          sender: 'meridian',
          text: "That makes a lot of sense. You're operating in the overlap between design and implementation. Let's evaluate a Direction that bridges these two:",
          timestamp: new Date(Date.now() - 3600000 * 2.05),
          structuredData: {
            type: 'direction',
            title: 'Design Systems Engineer',
            subtitle: 'Creative Developer & Architect',
            compatibility: '96% Compatibility',
            description: 'Bridges the gap between design tokens and production code, crafting reusable design patterns, layouts, and interactive experiences.',
            steps: [
              'Build a portfolio showing both Figma variables and final polished React code.',
              'Master advanced animation principles (orchestrating transitions, micro-interactions).',
              'Collaborate with brand designers to build unified token structures.'
            ],
            tags: ['UI Engineering', 'Figma API', 'Framer Motion', 'Design Tokens']
          }
        },
        {
          id: 'm1-4',
          sender: 'meridian',
          text: "How does this direction resonate with your day-to-day energy?",
          timestamp: new Date(Date.now() - 3600000 * 2)
        }
      ]
    },
    {
      id: 'conv-2',
      title: 'Creative Tech Roadmap',
      preview: 'To target creative agencies, focus on motion and WebGL...',
      lastActive: new Date(Date.now() - 3600000 * 24), // 24 hours ago
      messages: [
        {
          id: 'm2-1',
          sender: 'meridian',
          text: 'Welcome back! How are you thinking about your portfolio structure today?',
          timestamp: new Date(Date.now() - 3600000 * 24.2)
        },
        {
          id: 'm2-2',
          sender: 'user',
          text: 'I want to restructure my portfolio to target premium creative studios.',
          timestamp: new Date(Date.now() - 3600000 * 24.1)
        },
        {
          id: 'm2-3',
          sender: 'meridian',
          text: "For creative tech studios, demonstrating high-end visual polish is essential. They look for storytelling and micro-interactions. Let's map out a target roadmap:",
          timestamp: new Date(Date.now() - 3600000 * 24),
          structuredData: {
            type: 'roadmap',
            title: 'Interactive Tech Portfolio',
            subtitle: 'Creative Studio Alignment',
            compatibility: 'Roadmap Activated',
            description: 'A modular project collection designed to show depth in layout control, state-driven motion, and WebGL graphics.',
            steps: [
              'Phase 1: Build 3 interactive micro-experiments highlighting physics or shaders.',
              'Phase 2: Add Case Studies highlighting the technical hurdles and layout solutions.',
              'Phase 3: Keep core navigation simple and typography highly stylized.'
            ]
          }
        }
      ]
    }
  ])

  // UI state
  const [activeTab, setActiveTab] = useState<'conversations' | 'profile' | 'path'>('conversations')
  const [activeConversationId, setActiveConversationId] = useState<string>('conv-1')
  const [inputValue, setInputValue] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'profile' | 'voice' | 'about'>('profile')
  const [voiceSelection, setVoiceSelection] = useState('aria')
  const [userName, setUserName] = useState('Alex Carter')
  const [userEmail, setUserEmail] = useState('alex.carter@meridian.io')

  // Voice Mode state
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'speaking'>('listening')
  const [transcriptionText, setTranscriptionText] = useState('')
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  // Real backend integration state
  const [chatMode, setChatMode] = useState<'onboarding' | 'general' | 'checkin'>('onboarding')
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean | null>(null)
  const [profileData, setProfileData] = useState<any>(null)
  const [pathData, setPathData] = useState<any>(null)
  const [directionsData, setDirectionsData] = useState<any>(null)
  const [isGeneratingPath, setIsGeneratingPath] = useState(false)
  const [isGeneratingDirections, setIsGeneratingDirections] = useState(false)

  // WebSocket and Audio refs
  const wsRef = useRef<WebSocket | null>(null)
  const inputAudioCtxRef = useRef<AudioContext | null>(null)
  const outputAudioCtxRef = useRef<AudioContext | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const speakingTimeoutRef = useRef<any | null>(null)

  // Audio processing helpers
  const convertFloat32ToInt16 = (buffer: Float32Array) => {
    let l = buffer.length;
    const buf = new Int16Array(l);
    while (l--) {
      const s = Math.max(-1, Math.min(1, buffer[l]));
      buf[l] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return buf.buffer;
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const base64ToArrayBuffer = (base64: string) => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const convertInt16ToFloat32 = (buffer: ArrayBuffer) => {
    const int16Array = new Int16Array(buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }
    return float32Array;
  };

  const appendVoiceMessage = (sender: 'user' | 'meridian', text: string) => {
    setConversations(prev => prev.map(c => {
      if (c.id === activeConversationId) {
        const lastMsg = c.messages[c.messages.length - 1];
        if (lastMsg && lastMsg.text === text && lastMsg.sender === sender) {
          return c;
        }
        return {
          ...c,
          messages: [...c.messages, {
            id: `voice-${Date.now()}-${Math.random()}`,
            sender,
            text,
            timestamp: new Date()
          }],
          preview: text.length > 50 ? text.substring(0, 50) + '...' : text,
          lastActive: new Date()
        };
      }
      return c;
    }));
  };

  const startVoiceSession = async () => {
    setIsVoiceMode(true);
    setVoiceState('listening');
    setTranscriptionText('Connecting...');
    
    try {
      const { sessionId } = await api.voice.startSession({ conversationId: activeConversationId || undefined });
      setCurrentSessionId(sessionId);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const baseWsUrl = (import.meta.env.VITE_API_BASE_URL || 'https://meridian-api-production-ce31.up.railway.app')
        .replace(/\/$/, '')
        .replace(/^http/, 'ws');
      
      const token = sessionStorage.getItem('meridian_token') || '';
      let wsUrl = `${baseWsUrl}/api/voice/session/${sessionId}`;
      if (token) {
        wsUrl += `?token=${encodeURIComponent(token)}`;
      }
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputAudioCtxRef.current = inputCtx;

      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputAudioCtxRef.current = outputCtx;

      let nextPlaybackTime = 0;

      ws.onopen = () => {
        setTranscriptionText('Listening...');
        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        source.connect(processor);
        processor.connect(inputCtx.destination);
        
        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const inputData = e.inputBuffer.getChannelData(0);
          const int16Buffer = convertFloat32ToInt16(inputData);
          const base64 = arrayBufferToBase64(int16Buffer);
          ws.send(JSON.stringify({ type: 'audio', audio: base64 }));
        };
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'audio' && data.audio) {
            const arrayBuf = base64ToArrayBuffer(data.audio);
            const float32 = convertInt16ToFloat32(arrayBuf);
            
            if (outputCtx.state === 'suspended') {
              outputCtx.resume();
            }

            const audioBuffer = outputCtx.createBuffer(1, float32.length, 24000);
            audioBuffer.getChannelData(0).set(float32);

            const sourceNode = outputCtx.createBufferSource();
            sourceNode.buffer = audioBuffer;
            sourceNode.connect(outputCtx.destination);

            const currentTime = outputCtx.currentTime;
            if (nextPlaybackTime < currentTime) {
              nextPlaybackTime = currentTime;
            }
            
            sourceNode.start(nextPlaybackTime);
            nextPlaybackTime += audioBuffer.duration;
            
            setVoiceState('speaking');
            if (speakingTimeoutRef.current) {
              clearTimeout(speakingTimeoutRef.current);
            }
            speakingTimeoutRef.current = setTimeout(() => {
              setVoiceState('listening');
            }, (nextPlaybackTime - outputCtx.currentTime) * 1000);
            
          } else if (data.type === 'transcription') {
            setTranscriptionText(data.text);
            if (data.sender === 'user') {
              appendVoiceMessage('user', data.text);
            } else {
              appendVoiceMessage('meridian', data.text);
            }
          }
        } catch (err) {
          console.error('Error in voice WebSocket onmessage:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('Voice WS error:', err);
      };

      ws.onclose = () => {
        console.log('Voice WS connection closed');
      };

    } catch (err: any) {
      console.error('Error starting voice mode session:', err);
      setTranscriptionText(`Error: ${err.message || 'Could not start'}`);
      setVoiceState('idle');
    }
  };

  const endVoiceSession = async () => {
    setIsVoiceMode(false);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close();
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close();
      outputAudioCtxRef.current = null;
    }
    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current);
      speakingTimeoutRef.current = null;
    }
    if (currentSessionId) {
      try {
        const res = await api.voice.endSession(currentSessionId);
        if (res && res.transcript && res.transcript.length > 0) {
          setConversations(prev => prev.map(c => {
            if (c.id === activeConversationId) {
              const existingMessageIds = new Set(c.messages.map(m => m.text + m.sender));
              const newMessages = [...c.messages];
              
              res.transcript?.forEach((t: any) => {
                const sender = (t.sender === 'user' ? 'user' : 'meridian');
                const key = (t.text || t.content || '') + sender;
                if (!existingMessageIds.has(key)) {
                  newMessages.push({
                    id: t.id || `voice-${Date.now()}-${Math.random()}`,
                    sender,
                    text: t.text || t.content || '',
                    timestamp: t.timestamp ? new Date(t.timestamp) : new Date(),
                    channel: 'voice'
                  });
                  existingMessageIds.add(key);
                }
              });

              return {
                ...c,
                messages: newMessages,
                preview: newMessages[newMessages.length - 1]?.text || c.preview,
                lastActive: new Date()
              };
            }
            return c;
          }));
        }
      } catch (err) {
        console.error('Failed to end voice session:', err);
      }
      setCurrentSessionId(null);
    }
  };

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (micStreamRef.current) micStreamRef.current.getTracks().forEach(t => t.stop());
      if (inputAudioCtxRef.current) inputAudioCtxRef.current.close();
      if (outputAudioCtxRef.current) outputAudioCtxRef.current.close();
      if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
    };
  }, []);

  // Resize listener to check if current viewport is mobile (to prevent Framer Motion transform overrides on desktop)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Initialize onboarding status and load data
  useEffect(() => {
    if (!isLoggedIn()) return;
    
    const initData = async () => {
      try {
        let statusRes: any;
        try {
          statusRes = await api.onboarding.getStatus();
        } catch (err: any) {
          // TEMP: mitigates a possible backend trigger race condition, real fix needed on backend
          if (err.message && (err.message.includes('User record not found') || err.message.includes('USER_NOT_FOUND') || err.message === 'true')) {
            console.log('[INIT DATA] USER_NOT_FOUND detected. Retrying in 1.5 seconds to mitigate backend trigger race...');
            await new Promise(resolve => setTimeout(resolve, 1500));
            statusRes = await api.onboarding.getStatus();
          } else {
            throw err;
          }
        }
        setIsOnboardingCompleted(statusRes.completed);
        
        if (statusRes.completed) {
          setChatMode('general');
          // Load general conversation history
          const historyRes = await api.conversation.getHistory();
          const mappedMessages: Message[] = (historyRes.messages || []).map((m: any) => ({
            id: m.id || `msg-${Math.random()}`,
            sender: (m.sender === 'assistant' || m.sender === 'meridian' ? 'meridian' : 'user') as 'user' | 'meridian',
            text: m.text || m.content || '',
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
            structuredData: m.structuredData || m.structured_data || undefined
          }));
          
          if (mappedMessages.length === 0) {
            mappedMessages.push({
              id: `welcome-${Date.now()}`,
              sender: 'meridian',
              text: "Welcome back to Meridian! Your capability profile and career tracks are live. Ask me anything to refine your journey.",
              timestamp: new Date()
            });
          }

          setConversations([
            {
              id: 'conv-1',
              title: 'Career Advisory',
              preview: mappedMessages[mappedMessages.length - 1]?.text || 'Chat thread...',
              lastActive: new Date(),
              messages: mappedMessages
            }
          ]);
          setActiveConversationId('conv-1');

          // Preload profile, path, and directions
          loadProfileAndPathAndDirections();
        } else {
          setChatMode('onboarding');
          // Load onboarding history
          const onboardingHistoryRes = await api.onboarding.getHistory();
          const mappedMessages: Message[] = (onboardingHistoryRes.messages || []).map((m: any) => ({
            id: m.id || `msg-${Math.random()}`,
            sender: (m.sender === 'assistant' || m.sender === 'meridian' ? 'meridian' : 'user') as 'user' | 'meridian',
            text: m.text || m.content || '',
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
          }));
          
          if (mappedMessages.length === 0) {
            mappedMessages.push({
              id: `m1-1`,
              sender: 'meridian',
              text: "Hi there! I'm Meridian. Let's figure out where you're headed. What kind of work are you doing right now?",
              timestamp: new Date()
            });
          }
          
          setConversations([
            {
              id: 'conv-1',
              title: 'Onboarding Inventory',
              preview: mappedMessages[mappedMessages.length - 1]?.text || 'Onboarding chat...',
              lastActive: new Date(),
              messages: mappedMessages
            }
          ]);
          setActiveConversationId('conv-1');
        }
      } catch (err) {
        console.error('Failed to initialize chat data:', err);
      }
    };
    
    initData();
  }, []);

  const loadProfileAndPathAndDirections = async () => {
    try {
      const prof = await api.profile.get();
      setProfileData(prof.profile || prof);
      if (prof.display_name) {
        setUserName(prof.display_name);
      }
      
      const pathRes = await api.path.get();
      setPathData(pathRes.path || pathRes);

      const dirs = await api.directions.get();
      setDirectionsData(dirs);
    } catch (err) {
      console.error('Error loading sub-views data:', err);
    }
  };

  const handleCompleteOnboarding = async () => {
    setIsThinking(true);
    try {
      const completeRes = await api.onboarding.complete();
      setIsOnboardingCompleted(true);
      setChatMode('general');
      
      const prof = completeRes.profile || (await api.profile.get());
      setProfileData(prof);
      
      // Auto-trigger generations
      setIsGeneratingDirections(true);
      try {
        const genDirs = await api.directions.generate();
        setDirectionsData(genDirs);
      } catch (err) {
        console.error('Failed to generate directions:', err);
      } finally {
        setIsGeneratingDirections(false);
      }

      setIsGeneratingPath(true);
      try {
        const genPath = await api.path.generate();
        setPathData(genPath);
      } catch (err) {
        console.error('Failed to generate path:', err);
      } finally {
        setIsGeneratingPath(false);
      }

      // Load general conversation
      const historyRes = await api.conversation.getHistory();
      const mapped: Message[] = (historyRes.messages || []).map((m: any) => ({
        id: m.id || `msg-${Math.random()}`,
        sender: (m.sender === 'assistant' || m.sender === 'meridian' ? 'meridian' : 'user') as 'user' | 'meridian',
        text: m.text || m.content || '',
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
      }));

      if (mapped.length === 0) {
        mapped.push({
          id: `welcome-${Date.now()}`,
          sender: 'meridian',
          text: "Onboarding complete! Your profile, directions, and action blueprint have been generated. Let me know what you would like to discuss next.",
          timestamp: new Date()
        });
      }

      setConversations([
        {
          id: 'conv-1',
          title: 'Career Advisory',
          preview: mapped[mapped.length - 1]?.text || 'Chat thread...',
          lastActive: new Date(),
          messages: mapped
        }
      ]);
      setActiveConversationId('conv-1');

    } catch (err) {
      console.error('Error completing onboarding:', err);
    } finally {
      setIsThinking(false);
    }
  };

  // Check active tab transitions
  useEffect(() => {
    if (!isLoggedIn()) return;
    if (activeTab === 'profile') {
      api.profile.get().then(res => {
        setProfileData(res.profile || res);
      }).catch(err => console.error('Error fetching profile:', err));
    } else if (activeTab === 'path') {
      api.path.get().then(res => {
        setPathData(res.path || res);
      }).catch(err => console.error('Error fetching path:', err));
      api.directions.get().then(res => {
        setDirectionsData(res);
      }).catch(err => console.error('Error fetching directions:', err));
    }
  }, [activeTab]);

  // Auto-scroll ref
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [activeConversationId, conversations, isThinking])

  // Get active conversation
  const activeConversation = conversations.find(c => c.id === activeConversationId)

  // Start new conversation
  const handleNewConversation = () => {
    const newId = `conv-${Date.now()}`
    const newConv: Conversation = {
      id: newId,
      title: 'New Conversation',
      preview: 'Empty chat thread...',
      lastActive: new Date(),
      messages: []
    }
    setConversations([newConv, ...conversations])
    setActiveConversationId(newId)
    setActiveTab('conversations')
    setIsSidebarOpen(false)
  }

  // Handle suggestion chips
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion)
    // Auto submit to make it snappy
    submitMessage(suggestion)
  }

  // Send message
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return
    submitMessage(inputValue)
  }

  const submitMessage = async (textVal: string) => {
    const userMsgId = `msg-${Date.now()}`
    const userMsg: Message = {
      id: userMsgId,
      sender: 'user',
      text: textVal,
      timestamp: new Date()
    }

    // Update conversation locally with user message
    setConversations(prev => prev.map(c => {
      if (c.id === activeConversationId) {
        return {
          ...c,
          messages: [...c.messages, userMsg],
          preview: textVal.length > 50 ? textVal.substring(0, 50) + '...' : textVal,
          title: c.title === 'New Conversation' ? (textVal.length > 25 ? textVal.substring(0, 25) + '...' : textVal) : c.title,
          lastActive: new Date()
        }
      }
      return c
    }))

    setInputValue('')
    setIsThinking(true)

    try {
      let response: any;
      const getResponse = async () => {
        if (!isOnboardingCompleted) {
          // Onboarding mode
          return await api.onboarding.getMessage({ message: textVal });
        } else if (chatMode === 'checkin') {
          // Check-in mode
          return await api.checkin.message({ message: textVal });
        } else {
          // General conversation mode
          return await api.conversation.message({ message: textVal });
        }
      };

      try {
        response = await getResponse();
      } catch (err: any) {
        // TEMP: mitigates a possible backend trigger race condition, real fix needed on backend
        if (err.message && (err.message.includes('User record not found') || err.message.includes('USER_NOT_FOUND') || err.message === 'true')) {
          console.log('[CHAT MESSAGE] USER_NOT_FOUND detected. Retrying in 1.5 seconds to mitigate backend trigger race...');
          await new Promise(resolve => setTimeout(resolve, 1500));
          response = await getResponse();
        } else {
          throw err;
        }
      }

      // Check if response has structured data
      const assistantMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: 'meridian',
        text: response.response || response.message || response.text || '',
        timestamp: new Date(),
        structuredData: response.structuredData || response.structured_data || undefined
      };

      setConversations(prev => prev.map(c => {
        if (c.id === activeConversationId) {
          return {
            ...c,
            messages: [...c.messages, assistantMsg],
            lastActive: new Date()
          }
        }
        return c;
      }));

      // Check onboarding status in background to trigger completion if needed
      if (!isOnboardingCompleted) {
        const statusRes = await api.onboarding.getStatus();
        if (statusRes.completed) {
          await handleCompleteOnboarding();
        }
      }

    } catch (err) {
      console.error('Error sending message:', err);
      const errorMsg: Message = {
        id: `msg-err-${Date.now()}`,
        sender: 'meridian',
        text: "Sorry, I encountered an issue sending that message. Please try again.",
        timestamp: new Date()
      };
      setConversations(prev => prev.map(c => {
        if (c.id === activeConversationId) {
          return {
            ...c,
            messages: [...c.messages, errorMsg],
            lastActive: new Date()
          }
        }
        return c;
      }));
    } finally {
      setIsThinking(false);
    }
  }

  // Format timestamp helper (commented out to avoid unused variable warning)
  // const formatTime = (date: Date) => {
  //   return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  // }

  return (
    <div className="flex h-screen w-full bg-black text-white relative font-sans overflow-hidden">
      
      {/* MOBILE TOP BAR (slim navigation for mobile) */}
      <div className="md:hidden flex items-center justify-between w-full h-[60px] bg-[#0A0A0A] border-b border-white/5 px-4 fixed top-0 left-0 z-30">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-white/5 rounded-lg active:scale-95 transition-all text-white/80 hover:text-white"
            aria-label="Open Sidebar"
          >
            {/* Hamburger Icon */}
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          
          {/* Logo Glyph + Wordmark */}
          <div className="flex items-center gap-[8px]" onClick={() => window.location.reload()}>
            <svg viewBox="0 22 112 86" className="w-[20px] h-[15.5px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M111.967 22.4375H95.5009C91.4918 22.4375 87.8408 24.8 86.1942 28.451L79.4647 43.2701C76.1 50.6439 69.5137 55.9416 61.782 57.7313C59.1332 58.304 56.6276 56.2995 56.6276 53.6507V22.4375H51.3299C46.3186 22.4375 41.3789 23.8693 37.0835 26.5181C32.7882 29.1669 29.3518 32.9612 27.1326 37.4714L18.1122 55.512C16.6804 58.3756 13.8168 60.3085 10.5953 60.4517L0 60.8813L0.0715898 107.343H16.5373C20.5463 107.343 24.1974 104.981 25.8439 101.33L32.5018 86.5104C35.8665 79.1367 42.4528 73.839 50.1845 72.0493C52.8333 71.4766 55.339 73.4811 55.339 76.1299V107.343H60.6366C65.6479 107.343 70.5876 105.911 74.883 103.262C79.1784 100.614 82.6147 96.8194 84.834 92.3092L93.7827 74.2686C95.2145 71.405 98.0781 69.472 101.3 69.3289L111.895 68.8993L111.967 22.4375Z"
                fill="#F7F7F7"
              />
            </svg>
            <span className="font-sans font-semibold text-[15px] tracking-tight lowercase text-white">
              north<span className="text-[#F7F7F7]">.</span>
            </span>
          </div>
        </div>

        <button 
          onClick={handleNewConversation}
          className="p-2 hover:bg-white/5 rounded-lg active:scale-95 text-white/80 hover:text-white"
          aria-label="New Conversation"
        >
          {/* Plus icon */}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      {/* BACKDROP FOR MOBILE SIDEBAR */}
      <AnimatePresence>
        {!isVoiceMode && isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/70 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR (Responsive drawer on mobile, persistent on desktop) */}
      {!isVoiceMode ? (
        <motion.aside
          key="normal-sidebar"
          initial={false}
          animate={{ 
            x: isMobile ? (isSidebarOpen ? 0 : '-100%') : 0,
            width: '270px',
            transition: { type: 'spring', damping: 25, stiffness: 200 }
          }}
          className={`fixed top-0 bottom-0 left-0 z-50 w-[270px] bg-[#0A0A0A] border-r border-white/5 flex flex-col justify-between pt-4 pb-5 md:pt-6 md:pb-6 md:static md:flex shrink-0`}
        >
          {/* Sidebar Header & Brand */}
          <div className="px-5 mb-5 flex items-center justify-between">
            <div className="flex items-center gap-[10px] select-none group cursor-pointer" onClick={() => window.location.reload()}>
              {/* Small North glyph */}
              <svg
                viewBox="0 22 112 86"
                className="w-[24px] h-[18.5px] shrink-0"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M111.967 22.4375H95.5009C91.4918 22.4375 87.8408 24.8 86.1942 28.451L79.4647 43.2701C76.1 50.6439 69.5137 55.9416 61.782 57.7313C59.1332 58.304 56.6276 56.2995 56.6276 53.6507V22.4375H51.3299C46.3186 22.4375 41.3789 23.8693 37.0835 26.5181C32.7882 29.1669 29.3518 32.9612 27.1326 37.4714L18.1122 55.512C16.6804 58.3756 13.8168 60.3085 10.5953 60.4517L0 60.8813L0.0715898 107.343H16.5373C20.5463 107.343 24.1974 104.981 25.8439 101.33L32.5018 86.5104C35.8665 79.1367 42.4528 73.839 50.1845 72.0493C52.8333 71.4766 55.339 73.4811 55.339 76.1299V107.343H60.6366C65.6479 107.343 70.5876 105.911 74.883 103.262C79.1784 100.614 82.6147 96.8194 84.834 92.3092L93.7827 74.2686C95.2145 71.405 98.0781 69.472 101.3 69.3289L111.895 68.8993L111.967 22.4375Z"
                  fill="#F7F7F7"
                />
              </svg>
              {/* Wordmark */}
              <span className="font-sans font-semibold text-[17px] tracking-tight text-white lowercase leading-none">
                north<span className="text-[#F7F7F7]">.</span>
              </span>
            </div>

            {/* Close Sidebar Icon (mobile only) */}
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-1 hover:bg-white/5 rounded text-white/50 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* New Conversation Button */}
          <div className="px-4 mb-5">
            <button
              onClick={handleNewConversation}
              className="w-full bg-white text-black hover:bg-[#F7F7F7] font-semibold text-[14px] px-4 py-3 rounded-full flex items-center justify-center gap-2 select-none active:scale-[0.98] transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New conversation
            </button>
          </div>

          {/* Sidebar Nav Items */}
          <div className="flex-1 overflow-y-auto px-2 space-y-5">
            {/* Main Navigation links */}
            <div className="space-y-1">
              <button
                onClick={() => {
                  setActiveTab('conversations')
                  setIsSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-full font-medium text-[14px] select-none text-left transition-all ${
                  activeTab === 'conversations'
                    ? 'bg-white/5 text-white border-l-2 border-[#FF51CB]/80 pl-2.5'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
                Conversations
              </button>

              <button
                onClick={() => {
                  setActiveTab('profile')
                  setIsSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-full font-medium text-[14px] select-none text-left transition-all ${
                  activeTab === 'profile'
                    ? 'bg-white/5 text-white border-l-2 border-[#FF51CB]/80 pl-2.5'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {/* Profile / ID Icon */}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                My Profile
              </button>

              <button
                onClick={() => {
                  setActiveTab('path')
                  setIsSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-full font-medium text-[14px] select-none text-left transition-all ${
                  activeTab === 'path'
                    ? 'bg-white/5 text-white border-l-2 border-[#FF51CB]/80 pl-2.5'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {/* Path / Map Pin Icon */}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503-3.46c2.893-.07 5.154-.352 5.154-.352v-1.12s-2.26-.283-5.154-.352a17.95 17.95 0 00-12.835 0C2.047 11.21.01 11.432.01 11.432v1.12s2.037-.22 4.767-.31a15.047 15.047 0 019.726 1.052z" />
                </svg>
                My Path
              </button>
            </div>

            {/* Recents list (Only visible under Conversations tab) */}
            {activeTab === 'conversations' && (
              <div className="space-y-2 mt-4">
                <span className="text-[11px] font-semibold text-white/30 uppercase tracking-widest px-3 block">
                  Recents
                </span>
                <div className="space-y-1">
                  {conversations.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setActiveConversationId(c.id)}
                      className={`w-full flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl text-left select-none transition-all ${
                        activeConversationId === c.id
                          ? 'bg-white/5 border border-white/10'
                          : 'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <span className="font-semibold text-white/95 text-[12px] truncate w-full">
                        {c.title}
                      </span>
                      <span className="text-white/40 text-[11px] truncate w-full">
                        {c.preview}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Bottom Account Section */}
          <div className="border-t border-white/5 pt-4 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3 select-none">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#E71800] to-[#FF51CB] flex items-center justify-center text-white font-bold text-[13px] shadow-sm uppercase">
                {userName.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-[13px] text-white leading-tight truncate max-w-[120px]">
                  {userName}
                </span>
                <span className="text-[11px] text-white/40 leading-none mt-0.5">
                  Pro Member
                </span>
              </div>
            </div>
            
            <div className="flex gap-1">
              {/* Settings button */}
              <button 
                onClick={() => setShowSettings(true)}
                className="p-2 hover:bg-white/5 rounded-lg text-white/50 hover:text-white transition-colors"
                aria-label="Settings"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.645-.869l.214-1.28z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {/* Logout button */}
              <button 
                onClick={onLogout}
                className="p-2 hover:bg-white/5 rounded-lg text-white/50 hover:text-white transition-colors"
                aria-label="Log Out"
              >
                <svg className="w-4 h-4 text-red-500/80 hover:text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </button>
            </div>
          </div>
        </motion.aside>
      ) : (
        /* Collapsed Icon Rail (far left) while in Voice Mode */
        <motion.div
          key="collapsed-sidebar"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: isMobile ? 0 : 72, opacity: isMobile ? 0 : 1 }}
          transition={{ duration: 0.3 }}
          className={`h-full bg-[#0A0A0A] border-r border-white/5 flex flex-col items-center justify-between pt-6 pb-6 select-none z-50 shrink-0 ${isMobile ? 'hidden' : 'flex'}`}
        >
          {/* Logo Glyph */}
          <div className="flex flex-col items-center gap-6 w-full">
            <div className="flex items-center justify-center p-2 hover:bg-white/5 rounded-xl cursor-pointer" onClick={() => window.location.reload()}>
              <svg viewBox="0 22 112 86" className="w-[20px] h-[15.5px]" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M111.967 22.4375H95.5009C91.4918 22.4375 87.8408 24.8 86.1942 28.451L79.4647 43.2701C76.1 50.6439 69.5137 55.9416 61.782 57.7313C59.1332 58.304 56.6276 56.2995 56.6276 53.6507V22.4375H51.3299C46.3186 22.4375 41.3789 23.8693 37.0835 26.5181C32.7882 29.1669 29.3518 32.9612 27.1326 37.4714L18.1122 55.512C16.6804 58.3756 13.8168 60.3085 10.5953 60.4517L0 60.8813L0.0715898 107.343H16.5373C20.5463 107.343 24.1974 104.981 25.8439 101.33L32.5018 86.5104C35.8665 79.1367 42.4528 73.839 50.1845 72.0493C52.8333 71.4766 55.339 73.4811 55.339 76.1299V107.343H60.6366C65.6479 107.343 70.5876 105.911 74.883 103.262C79.1784 100.614 82.6147 96.8194 84.834 92.3092L93.7827 74.2686C95.2145 71.405 98.0781 69.472 101.3 69.3289L111.895 68.8993L111.967 22.4375Z"
                  fill="#F7F7F7"
                />
              </svg>
            </div>
            
            {/* Nav Icons */}
            <div className="flex flex-col items-center gap-4 w-full px-2">
              {/* New Conversation Icon */}
              <button
                onClick={handleNewConversation}
                className="w-10 h-10 rounded-full bg-white text-black hover:bg-[#F7F7F7] flex items-center justify-center transition-all active:scale-95"
                title="New Conversation"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>

              {/* Conversations Icon */}
              <button
                onClick={() => {
                  setActiveTab('conversations');
                  endVoiceSession();
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  activeTab === 'conversations' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                title="Conversations"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </button>

              {/* My Profile Icon */}
              <button
                onClick={() => {
                  setActiveTab('profile');
                  endVoiceSession();
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  activeTab === 'profile' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                title="My Profile"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </button>

              {/* My Path Icon */}
              <button
                onClick={() => {
                  setActiveTab('path');
                  endVoiceSession();
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  activeTab === 'path' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                title="My Path"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503-3.46c2.893-.07 5.154-.352 5.154-.352v-1.12s-2.26-.283-5.154-.352a17.95 17.95 0 00-12.835 0C2.047 11.21.01 11.432.01 11.432v1.12s2.037-.22 4.767-.31a15.047 15.047 0 019.726 1.052z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Account Avatar at bottom */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#E71800] to-[#FF51CB] flex items-center justify-center text-white font-bold text-[13px] shadow-sm uppercase select-none">
            {userName.charAt(0)}
          </div>
        </motion.div>
      )}

      {/* MAIN VIEW CONTENT CONTAINER */}
      <main className="flex-1 flex flex-col h-full bg-[#000000] relative overflow-hidden pt-[60px] md:pt-0">
        
        {/* Render Tab Views / Voice Takeover */}
        <AnimatePresence mode="wait">
          {isVoiceMode ? (
            /* Voice Mode takeover full-screen container */
            <motion.div
              key="voice-mode"
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex flex-col items-center justify-between p-6 md:p-12 relative w-full h-full"
            >
              {/* Top fade/glow to make the takeover feel premium */}
              <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-[#E71800]/5 via-transparent to-transparent pointer-events-none z-10" />

              {/* Header/Back arrow icon button for accessibility */}
              <div className="w-full flex justify-between items-center z-20">
                <button
                  onClick={endVoiceSession}
                  className="flex items-center gap-2 text-white/50 hover:text-white transition-all text-[14px] font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                  <span>Close Voice</span>
                </button>
                <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-full px-3 py-1 text-[11px] text-[#FF51CB]/80 font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF51CB] animate-ping" />
                  <span>Live</span>
                </div>
              </div>

              {/* Orb container */}
              <div className="flex-1 w-full flex flex-col items-center justify-center pb-24 z-20">
                <div className="relative flex items-center justify-center">
                  
                  {/* The outer glow */}
                  <motion.div
                    animate={{
                      scale: voiceState === 'speaking' ? [1, 1.15, 1] : [1, 1.05, 1],
                      opacity: voiceState === 'speaking' ? [0.4, 0.7, 0.4] : [0.2, 0.35, 0.2],
                    }}
                    transition={{
                      duration: voiceState === 'speaking' ? 1.8 : 4,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute w-52 h-52 md:w-60 md:h-60 rounded-full bg-gradient-to-tr from-[#E71800] via-[#FF51CB] to-[#F7F7F7] opacity-25 filter blur-3xl"
                  />

                  {/* The actual Orb */}
                  <motion.div
                    animate={{
                      scale: voiceState === 'speaking' ? [1, 1.08, 0.96, 1.04, 1] : [1, 1.03, 1],
                    }}
                    transition={{
                      duration: voiceState === 'speaking' ? 2.5 : 5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="w-40 h-40 md:w-48 md:h-48 rounded-full relative overflow-hidden bg-[#0A0A0A] border border-white/10 flex items-center justify-center shadow-2xl"
                  >
                    {/* Layer 1: Red Blob */}
                    <motion.div
                      animate={{
                        x: voiceState === 'speaking' ? [-15, 20, -10, 15, -15] : [-10, 10, -10],
                        y: voiceState === 'speaking' ? [-10, 15, -15, 10, -10] : [-5, 5, -5],
                        scale: voiceState === 'speaking' ? [1, 1.25, 0.85, 1.1, 1] : [1, 1.08, 1],
                      }}
                      transition={{
                        duration: voiceState === 'speaking' ? 3.5 : 7,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="absolute w-32 h-32 md:w-36 md:h-36 rounded-full bg-[#E71800] opacity-60 mix-blend-screen filter blur-xl -left-6 -top-6"
                    />

                    {/* Layer 2: Pink Blob */}
                    <motion.div
                      animate={{
                        x: voiceState === 'speaking' ? [20, -15, 15, -10, 20] : [10, -10, 10],
                        y: voiceState === 'speaking' ? [15, -10, 10, -15, 15] : [5, -5, 5],
                        scale: voiceState === 'speaking' ? [0.9, 1.2, 0.9, 1.15, 0.9] : [0.95, 1.05, 0.95],
                      }}
                      transition={{
                        duration: voiceState === 'speaking' ? 4 : 8,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="absolute w-32 h-32 md:w-36 md:h-36 rounded-full bg-[#FF51CB] opacity-65 mix-blend-screen filter blur-xl -right-6 -bottom-6"
                    />

                    {/* Layer 3: White Blob */}
                    <motion.div
                      animate={{
                        x: voiceState === 'speaking' ? [-5, 10, -8, 5, -5] : [-3, 3, -3],
                        y: voiceState === 'speaking' ? [10, -5, 8, -10, 10] : [3, -3, 3],
                        scale: voiceState === 'speaking' ? [0.8, 1.1, 0.85, 1.05, 0.8] : [0.9, 1.0, 0.9],
                      }}
                      transition={{
                        duration: voiceState === 'speaking' ? 3 : 6,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="absolute w-24 h-24 md:w-28 md:h-28 rounded-full bg-[#F7F7F7] opacity-45 mix-blend-screen filter blur-lg left-8 top-8"
                    />

                    {/* Layer 4: Ambient Core Center */}
                    <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-transparent via-[#FF51CB]/10 to-[#F7F7F7]/5 filter blur-sm pointer-events-none" />
                  </motion.div>

                </div>

                {/* Transcription Display */}
                <div className="mt-12 w-full max-w-[540px] px-4">
                  <div className="w-full bg-[#151515] border border-white/5 rounded-2xl px-6 py-5 shadow-xl text-center min-h-[92px] flex items-center justify-center">
                    <p className={`font-sans text-[15px] sm:text-[16px] leading-[1.6] ${
                      transcriptionText ? 'text-white font-medium' : 'text-white/30 font-normal'
                    }`}>
                      {transcriptionText || 'Listening...'}
                    </p>
                  </div>
                </div>

              </div>

              {/* Exit Button bottom-right */}
              <button
                onClick={endVoiceSession}
                className="absolute bottom-6 right-6 md:bottom-12 md:right-12 w-14 h-14 rounded-full bg-[#151515] border border-white/10 hover:border-white/20 text-white/70 hover:text-white flex items-center justify-center shadow-2xl active:scale-90 transition-all z-30"
                title="Exit Voice Mode"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </button>
            </motion.div>
          ) : (
            /* Wrap normal tabs inside a motion.div so they exit cleanly when entering voice takeover */
            <motion.div
              key="tabs-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col h-full overflow-hidden relative w-full"
            >
              <AnimatePresence mode="wait">
                {activeTab === 'conversations' ? (
            <motion.div
              key="chat-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col h-full overflow-hidden relative"
            >
              {activeConversation && (
                <div className={`flex-1 flex flex-col w-full h-full relative items-center overflow-hidden ${
                  activeConversation.messages.length > 0 ? 'justify-between' : 'justify-center'
                }`}>
                  
                  {/* Top fade gradient overlay for active scroll state */}
                  {activeConversation.messages.length > 0 && (
                    <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black to-transparent pointer-events-none z-20" />
                  )}

                  {/* 1. MESSAGES LIST (Active state only) */}
                  <AnimatePresence>
                    {activeConversation.messages.length > 0 && (
                      <motion.div
                        key="messages-list"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, delay: 0.35 }}
                        className="flex-1 w-full overflow-y-auto px-4 md:px-8 pt-8 pb-4 space-y-8 scrollbar-thin relative scroll-smooth"
                      >
                        <div className="max-w-[720px] mx-auto w-full space-y-8 pt-6">
                          {activeConversation.messages.map((msg) => {
                            const isUser = msg.sender === 'user'
                            return (
                              <div 
                                key={msg.id}
                                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                              >
                                {isUser ? (
                                  <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="bg-[#1A1A1A] text-white px-5 py-3.5 rounded-2xl rounded-tr-sm max-w-[85%] sm:max-w-[70%] text-[14.5px] leading-[1.5] shadow-md border border-white/5 font-medium relative group"
                                  >
                                    {msg.text}
                                    {msg.channel === 'voice' && (
                                      <div className="flex items-center gap-1 mt-1.5 text-[10px] text-white/40 justify-end">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                        </svg>
                                        <span>Voice turn</span>
                                      </div>
                                    )}
                                  </motion.div>
                                ) : (
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.4, delay: 0.1 }}
                                    className="w-full text-left"
                                  >
                                    <div className="text-[#F7F7F7] text-[15px] sm:text-[16px] leading-[1.6] max-w-[88%] font-medium whitespace-pre-wrap relative group">
                                      {msg.text}
                                      {msg.channel === 'voice' && (
                                        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-white/40">
                                          <svg className="w-3 h-3 text-[#FF51CB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                          </svg>
                                          <span>Spoken response</span>
                                        </div>
                                      )}
                                    </div>

                                    {msg.structuredData && (
                                      <motion.div 
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5, delay: 0.3 }}
                                        className="mt-6 w-full max-w-[620px]"
                                      >
                                        {msg.structuredData.type === 'direction' ? (
                                          <div className="bg-[#0B0B0B]/80 backdrop-blur-md border border-white/10 rounded-2xl p-5 md:p-6 shadow-2xl relative overflow-hidden group">
                                            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#E71800] to-[#FF51CB]" />
                                            <div className="flex items-start justify-between gap-4 mb-3">
                                              <div>
                                                <span className="text-[11px] font-bold text-[#FF51CB] uppercase tracking-wider block mb-1">
                                                  Suggested Direction
                                                </span>
                                                <h3 className="text-white font-bold text-[18px] sm:text-[20px] leading-tight">
                                                  {msg.structuredData.title}
                                                </h3>
                                                <p className="text-white/40 text-[12px] font-medium mt-0.5">
                                                  {msg.structuredData.subtitle}
                                                </p>
                                              </div>
                                              <div className="bg-[#FF51CB]/10 border border-[#FF51CB]/20 px-3 py-1 rounded-full text-[#FF51CB] font-bold text-[11px] select-none whitespace-nowrap shrink-0">
                                                {msg.structuredData.compatibility}
                                              </div>
                                            </div>
                                            <p className="text-white/70 text-[13.5px] leading-[1.5] mb-5 font-medium">
                                              {msg.structuredData.description}
                                            </p>
                                            {msg.structuredData.steps && (
                                              <div className="space-y-2.5 mb-5">
                                                <span className="text-[11px] font-bold text-white/30 uppercase tracking-widest block">
                                                  Bridging Action Steps
                                                </span>
                                                {msg.structuredData.steps.map((stepStr, sIndex) => (
                                                  <div 
                                                    key={sIndex}
                                                    className="bg-white/5 hover:bg-white/10 transition-colors border border-white/5 rounded-xl p-3 flex items-start gap-3 text-[12.5px] text-white/90 font-medium cursor-pointer"
                                                  >
                                                    <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white text-[10px] shrink-0 font-bold select-none">
                                                      {sIndex + 1}
                                                    </span>
                                                    <span className="leading-[1.4]">{stepStr}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                            {msg.structuredData.tags && (
                                              <div className="flex flex-wrap gap-1.5">
                                                {msg.structuredData.tags.map((tagStr, tIndex) => (
                                                  <span 
                                                    key={tIndex}
                                                    className="bg-white/5 border border-white/5 rounded-md px-2 py-0.5 text-white/50 text-[10px] font-medium select-none"
                                                  >
                                                    {tagStr}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="bg-[#0B0B0B]/80 backdrop-blur-md border border-white/10 rounded-2xl p-5 md:p-6 shadow-2xl relative overflow-hidden group">
                                            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-[#FF51CB]" />
                                            <div className="flex items-start justify-between gap-4 mb-3">
                                              <div>
                                                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block mb-1">
                                                  Transition Roadmap
                                                </span>
                                                <h3 className="text-white font-bold text-[18px] sm:text-[20px] leading-tight">
                                                  {msg.structuredData.title}
                                                </h3>
                                                <p className="text-white/40 text-[12px] font-medium mt-0.5">
                                                  {msg.structuredData.subtitle}
                                                </p>
                                              </div>
                                              <div className="bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full text-blue-400 font-bold text-[11px] select-none whitespace-nowrap shrink-0">
                                                {msg.structuredData.compatibility}
                                              </div>
                                            </div>
                                            <p className="text-white/70 text-[13.5px] leading-[1.5] mb-5 font-medium">
                                              {msg.structuredData.description}
                                            </p>
                                            {msg.structuredData.steps && (
                                              <div className="space-y-2.5">
                                                <span className="text-[11px] font-bold text-white/30 uppercase tracking-widest block">
                                                  Milestones
                                                </span>
                                                {msg.structuredData.steps.map((stepStr, sIndex) => (
                                                  <div 
                                                    key={sIndex}
                                                    className="bg-white/5 hover:bg-white/10 transition-colors border border-white/5 rounded-xl p-3 flex flex-col items-start gap-1 cursor-pointer"
                                                  >
                                                    <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                                                      {stepStr.split(':')[0]}
                                                    </p>
                                                    <p className="text-[12px] text-white/50 font-medium mt-1 leading-[1.4]">
                                                      {stepStr.split(':').slice(1).join(':').trim()}
                                                    </p>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </motion.div>
                                    )}
                                  </motion.div>
                                )}
                              </div>
                            )
                          })}

                          {isThinking && (
                            <div className="flex flex-col items-start">
                              <div className="flex items-center gap-2 px-2">
                                <div className="flex gap-1.5 items-center justify-center h-6 select-none">
                                  <span className="w-2.5 h-2.5 rounded-full bg-[#E71800] animate-bounce" style={{ animationDelay: '0ms' }} />
                                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF51CB] animate-bounce" style={{ animationDelay: '150ms' }} />
                                  <span className="w-2.5 h-2.5 rounded-full bg-[#F7F7F7] animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                                <span className="text-[12px] font-semibold text-white/40 animate-pulse">
                                  Meridian is thinking...
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Spacer to push the latest message into a comfortable middle-ish zone */}
                          <div className="h-[18vh] w-full shrink-0" />
                          <div ref={messagesEndRef} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* 2. HEADLINE (Empty state only) */}
                  <AnimatePresence>
                    {activeConversation.messages.length === 0 && (
                      <motion.div
                        key="empty-state-headline"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="w-full flex flex-col items-center select-none mb-8 px-4"
                      >
                        <div className="w-full max-w-[720px] flex flex-col items-center text-center">
                          {/* First line: "AI is changing your job." with radial gradient background clip */}
                          <motion.h1
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className="text-[28px] sm:text-[36px] md:text-[44px] leading-tight mb-2 tracking-tight font-bold text-center"
                          >
                            <span className="meridian-gradient-text meridian-headline-gradient">
                              AI is changing your job.
                            </span>
                          </motion.h1>
                          {/* Second line: "Let's get ahead of it." plain white text */}
                          <motion.h2
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.35 }}
                            className="text-[#F7F7F7] text-[24px] sm:text-[30px] md:text-[36px] font-sans font-medium tracking-tight"
                          >
                            Let's get ahead of it.
                          </motion.h2>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* 3. SHARED INPUT BAR CONTAINER (Transitions position with layout animation) */}
                  <motion.div
                    layout
                    transition={{ type: 'spring', damping: 26, stiffness: 170 }}
                    className={`w-full max-w-[720px] px-4 z-15 ${
                      activeConversation.messages.length > 0 ? 'mb-6 mt-2' : 'mb-8'
                    }`}
                  >
                    <form onSubmit={handleSend} className="w-full relative">
                      <div className="w-full bg-[#151515] border border-white/5 focus-within:border-white/10 rounded-full flex items-center px-3 py-2.5 sm:px-4 sm:py-[14px] transition-all shadow-xl">
                        
                        {/* Add/Attachment File button */}
                        <button
                          type="button"
                          onClick={() => console.log('TEMP: file attach')}
                          className="rounded-full flex items-center justify-center hover:bg-white/5 text-white/50 hover:text-white transition-all active:scale-90 shrink-0"
                          style={{ width: 'clamp(2.25rem, 5.5vw, 2.75rem)', height: 'clamp(2.25rem, 5.5vw, 2.75rem)' }}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                        </button>

                        <input
                          type="text"
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          placeholder="Tell me about your work..."
                          className="flex-1 bg-transparent border-none text-white focus:outline-none text-[15px] px-2 sm:px-4 placeholder-white/20 font-medium min-w-0"
                        />

                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          {/* Voice Mode Trigger */}
                          <button
                            type="button"
                            onClick={startVoiceSession}
                            className="rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-all active:scale-90 shrink-0"
                            style={{ width: 'clamp(2.25rem, 5.5vw, 2.75rem)', height: 'clamp(2.25rem, 5.5vw, 2.75rem)' }}
                            title="Voice Mode"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                            </svg>
                          </button>

                          {/* Submit Arrow Button */}
                          <button
                            type="submit"
                            disabled={!inputValue.trim()}
                            className={`rounded-full flex items-center justify-center transition-all shrink-0 ${
                              inputValue.trim() 
                                ? 'bg-white text-black hover:bg-[#F7F7F7] active:scale-90 shadow-sm' 
                                : 'bg-white/10 text-white/20 cursor-not-allowed'
                            }`}
                            style={{ width: 'clamp(2.25rem, 5.5vw, 2.75rem)', height: 'clamp(2.25rem, 5.5vw, 2.75rem)' }}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </form>
                  </motion.div>

                  {/* 4. CHIPS (Empty state only) */}
                  <AnimatePresence>
                    {activeConversation.messages.length === 0 && (
                      <motion.div
                        key="empty-state-chips"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.3 }}
                        className="w-full flex flex-wrap items-center justify-center gap-2.5 max-w-[620px] px-4 mb-4 select-none"
                      >
                        <button
                          onClick={() => handleSuggestionClick("I want to understand my options")}
                          className="bg-[#111111] hover:bg-[#1A1A1A] border border-white/5 hover:border-white/15 px-4 py-2.5 rounded-full text-white/80 hover:text-white text-[13px] font-medium transition-all active:scale-[0.98]"
                        >
                          I want to understand my options
                        </button>
                        <button
                          onClick={() => handleSuggestionClick("I'm not sure where to start")}
                          className="bg-[#111111] hover:bg-[#1A1A1A] border border-white/5 hover:border-white/15 px-4 py-2.5 rounded-full text-white/80 hover:text-white text-[13px] font-medium transition-all active:scale-[0.98]"
                        >
                          I'm not sure where to start
                        </button>
                        <button
                          onClick={() => handleSuggestionClick("Tell me how this works")}
                          className="bg-[#111111] hover:bg-[#1A1A1A] border border-white/5 hover:border-white/15 px-4 py-2.5 rounded-full text-white/80 hover:text-white text-[13px] font-medium transition-all active:scale-[0.98]"
                        >
                          Tell me how this works
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              )}            </motion.div>
          ) : activeTab === 'profile' ? (
            /* CAPABILITY PROFILE STUB VIEW - A highly stylized mockup that feels premium */
            <motion.div
              key="profile-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-y-auto px-4 md:px-8 py-8"
            >
              <div className="max-w-[800px] mx-auto w-full space-y-8 select-none">
                
                {/* Header Lockup */}
                <div className="border-b border-white/10 pb-6">
                  <span className="text-[11px] font-bold text-[#FF51CB] uppercase tracking-widest">
                    Meridian Profile
                  </span>
                  <h2 className="text-[28px] sm:text-[34px] font-sans font-bold text-white tracking-tight mt-1">
                    Your Capability Profile
                  </h2>
                  <p className="text-white/40 text-[14px] font-medium mt-1">
                    {profileData ? "Your capabilities and skills as analyzed by Meridian." : "// TEMP: build Capability Profile view. This interactive mockup shows your parsed strengths."}
                  </p>
                </div>

                {/* Dashboard layout cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Skill Card 1 */}
                  <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 w-[4px] bg-[#E71800]" />
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                      Core Competency
                    </span>
                    <h4 className="text-white font-bold text-[16px] mt-1.5">
                      {profileData?.core_competency || profileData?.skills?.[0] || 'Visual Systems Code'}
                    </h4>
                    <p className="text-white/60 text-[12px] mt-1 leading-[1.4]">
                      {profileData?.core_competency_description || profileData?.skills_description || 'Depth in bridging visual designs directly into clean modular systems, typography engines, and math-driven animations.'}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-[11px]">
                      <span className="text-white/40">Confidence Rating</span>
                      <span className="text-[#E71800] font-bold">95% Match</span>
                    </div>
                  </div>

                  {/* Skill Card 2 */}
                  <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 w-[4px] bg-[#FF51CB]" />
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                      Technical Stack
                    </span>
                    <h4 className="text-white font-bold text-[16px] mt-1.5">
                      {profileData?.technical_stack || profileData?.skills?.[1] || 'Layout & State Fluidity'}
                    </h4>
                    <p className="text-white/60 text-[12px] mt-1 leading-[1.4]">
                      {profileData?.technical_stack_description || 'Adept at responsive, state-driven interfaces using React hooks, orchestration in Framer Motion, and viewport clamps.'}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-[11px]">
                      <span className="text-white/40">Confidence Rating</span>
                      <span className="text-[#FF51CB] font-bold">92% Match</span>
                    </div>
                  </div>

                  {/* Skill Card 3 */}
                  <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 w-[4px] bg-blue-500" />
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                      Emerging Skill
                    </span>
                    <h4 className="text-white font-bold text-[16px] mt-1.5">
                      {profileData?.emerging_skill || profileData?.skills?.[2] || 'Interactive Graphics'}
                    </h4>
                    <p className="text-white/60 text-[12px] mt-1 leading-[1.4]">
                      {profileData?.emerging_skill_description || 'Early mastery of WebGL shaders, Canvas drawing APIs, and mathematical layout structures for custom visual pipelines.'}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-[11px]">
                      <span className="text-white/40">Target Bridge</span>
                      <span className="text-blue-400 font-bold">In Progress</span>
                    </div>
                  </div>
                </div>

                {/* Profile Details Inventory */}
                <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 space-y-6">
                  <h3 className="text-white font-bold text-[16px]">
                    Structured Metadata Inventory
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-[13px] border-t border-white/5 pt-5">
                    <div className="space-y-4">
                      <div>
                        <span className="text-white/30 block text-[11px] uppercase tracking-wider">
                          Primary Workstyle Preference
                        </span>
                        <span className="text-white font-medium block mt-0.5">
                          {profileData?.workstyle_preference || profileData?.preference || 'High autonomy, layout craftsmanship-focused'}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/30 block text-[11px] uppercase tracking-wider">
                          Ideal Target Companies
                        </span>
                        <span className="text-white font-medium block mt-0.5">
                          {profileData?.target_companies || profileData?.companies || 'Creative tech boutiques, design-led product companies'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <span className="text-white/30 block text-[11px] uppercase tracking-wider">
                          Scaffolded Bio Overview
                        </span>
                        <p className="text-white/70 font-medium block mt-0.5 leading-[1.4]">
                          "{profileData?.bio || 'Frontend systems engineer with a heavy design slant. Excels at bringing design intent to absolute parity in code and motion.'}"
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          ) : (
            /* MY PATH / CAREER DIRECTIONS VIEW - A beautiful interactive strategy roadmap */
            <motion.div
              key="path-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-y-auto px-4 md:px-8 py-8"
            >
              <div className="max-w-[800px] mx-auto w-full space-y-8 select-none">
                
                {/* Header Lockup */}
                <div className="border-b border-white/10 pb-6">
                  <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">
                    Directions & Blueprint
                  </span>
                  <h2 className="text-[28px] sm:text-[34px] font-sans font-bold text-white tracking-tight mt-1">
                    Your Roadmaps
                  </h2>
                  <p className="text-white/40 text-[14px] font-medium mt-1">
                    {directionsData || pathData ? "Your step-by-step career transition path." : "// TEMP: build Path/Directions view. Below are your activated career direction tracks."}
                  </p>
                </div>

                {(isGeneratingDirections || isGeneratingPath) && (
                  <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-10 h-10 rounded-full border-t-2 border-b-2 border-blue-400 animate-spin" />
                    <h3 className="text-white font-bold text-[16px]">Generating Strategy Blueprint</h3>
                    <p className="text-white/40 text-[12px] max-w-[320px]">
                      Analyzing your strengths and engineering profile to curate custom transition paths...
                    </p>
                  </div>
                )}

                {/* Primary Direction Track */}
                {!isGeneratingDirections && !isGeneratingPath && (
                  <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 bottom-0 right-0 w-[30%] bg-gradient-to-l from-[#FF51CB]/5 to-transparent pointer-events-none" />
                    
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-[#FF51CB]/10 border border-[#FF51CB]/20 px-2 py-0.5 rounded text-[#FF51CB] font-bold text-[10px] uppercase">
                            Primary Direction
                          </span>
                          <span className="text-white/30 text-[11px]">
                            Activated June 2026
                          </span>
                        </div>
                        <h3 className="text-white font-bold text-[20px] mt-2">
                          {directionsData?.title || (Array.isArray(directionsData) && directionsData[0]?.title) || pathData?.title || 'Design Systems Architect'}
                        </h3>
                        <p className="text-white/60 text-[13px] mt-1 leading-[1.4]">
                          {directionsData?.description || (Array.isArray(directionsData) && directionsData[0]?.description) || pathData?.description || 'Focuses on bridging production development speed with design precision by orchestrating tokens, tools, and visual frameworks.'}
                        </p>
                      </div>
                      <div className="bg-white text-black px-4 py-2 rounded-full font-bold text-[12px] shadow-md self-start">
                        {directionsData?.compatibility || (Array.isArray(directionsData) && directionsData[0]?.compatibility) || '96% Compatibility'}
                      </div>
                    </div>

                    {/* Horizontal node path */}
                    <div className="relative border-t border-white/10 pt-6 mt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {(pathData?.steps || pathData?.milestones || (Array.isArray(directionsData) && directionsData[0]?.steps) || [
                          { title: 'Bridge Token Systems', desc: 'Establish consistent naming conventions and tool bridges (Figma to JSON variables).' },
                          { title: 'Advanced Fluid Layouts', desc: 'Integrate standard animations, container queries, and responsive viewport logic.' },
                          { title: 'Target Design Teams', desc: 'Target product companies expanding design system divisions or premium visual studios.' }
                        ]).map((step: any, idx: number) => {
                          const stepTitle = typeof step === 'string' ? step.split(':')[0] : (step.title || `Phase ${idx + 1}`);
                          const stepDesc = typeof step === 'string' ? step.split(':').slice(1).join(':').trim() : (step.desc || step.description || '');
                          const colors = ['bg-[#E71800]', 'bg-[#FF51CB]', 'bg-blue-500'];
                          return (
                            <div key={idx} className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-full ${colors[idx % 3]} text-black font-bold text-[10px] flex items-center justify-center`}>
                                  {idx + 1}
                                </span>
                                <h4 className="text-white font-bold text-[13px]">
                                  {stepTitle}
                                </h4>
                              </div>
                              <p className="text-white/50 text-[12px] leading-[1.4] pl-7">
                                {stepDesc}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )}
  </AnimatePresence>

      </main>

      {/* SETTINGS DIALOG MODAL */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Dialog */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-[#0A0A0A] border border-white/10 rounded-2xl w-full max-w-[550px] shadow-2xl relative overflow-hidden z-10 flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="px-6 py-4.5 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-sans font-bold text-white text-[16px]">
                  Meridian Settings
                </h3>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-1 hover:bg-white/5 rounded text-white/50 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-white/5 px-4">
                <button
                  onClick={() => setSettingsTab('profile')}
                  className={`px-3 py-3 font-semibold text-[13px] border-b-2 transition-all ${
                    settingsTab === 'profile' 
                      ? 'border-[#FF51CB] text-white' 
                      : 'border-transparent text-white/40 hover:text-white'
                  }`}
                >
                  General Profile
                </button>
                <button
                  onClick={() => setSettingsTab('voice')}
                  className={`px-3 py-3 font-semibold text-[13px] border-b-2 transition-all ${
                    settingsTab === 'voice' 
                      ? 'border-[#FF51CB] text-white' 
                      : 'border-transparent text-white/40 hover:text-white'
                  }`}
                >
                  Voice Mode Preferences
                </button>
                <button
                  onClick={() => setSettingsTab('about')}
                  className={`px-3 py-3 font-semibold text-[13px] border-b-2 transition-all ${
                    settingsTab === 'about' 
                      ? 'border-[#FF51CB] text-white' 
                      : 'border-transparent text-white/40 hover:text-white'
                  }`}
                >
                  About Meridian
                </button>
              </div>

              {/* Tab Contents */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {settingsTab === 'profile' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider block">
                        Full Name
                      </label>
                      <input 
                        type="text" 
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="w-full bg-[#151515] border border-white/5 focus:border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none text-[14px] font-medium transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider block">
                        Account Email Address
                      </label>
                      <input 
                        type="email" 
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        className="w-full bg-[#151515] border border-white/5 focus:border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none text-[14px] font-medium transition-colors"
                      />
                    </div>
                  </div>
                )}

                {settingsTab === 'voice' && (
                  <div className="space-y-4">
                    <p className="text-[12px] text-white/50 leading-[1.5]">
                      Select the voice used when toggling voice-listening mode. Orbit visuals and real-time voice synthesis run on these preferences.
                    </p>

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider block">
                        Assistant Voice
                      </label>
                      
                      <div className="space-y-1.5">
                        <label className={`w-full flex items-center justify-between px-4 py-3.5 border rounded-xl cursor-pointer transition-colors ${
                          voiceSelection === 'aria' 
                            ? 'bg-[#FF51CB]/5 border-[#FF51CB]/30 text-white' 
                            : 'bg-white/5 border-transparent text-white/70 hover:bg-white/10'
                        }`}>
                          <div className="flex flex-col">
                            <span className="font-semibold text-[13px]">Aria</span>
                            <span className="text-[11px] text-white/40">Warm, conversational, standard tone</span>
                          </div>
                          <input 
                            type="radio" 
                            name="voice" 
                            checked={voiceSelection === 'aria'} 
                            onChange={() => setVoiceSelection('aria')}
                            className="text-[#FF51CB] focus:ring-[#FF51CB] accent-[#FF51CB]"
                          />
                        </label>

                        <label className={`w-full flex items-center justify-between px-4 py-3.5 border rounded-xl cursor-pointer transition-colors ${
                          voiceSelection === 'breeze' 
                            ? 'bg-[#FF51CB]/5 border-[#FF51CB]/30 text-white' 
                            : 'bg-white/5 border-transparent text-white/70 hover:bg-white/10'
                        }`}>
                          <div className="flex flex-col">
                            <span className="font-semibold text-[13px]">Breeze</span>
                            <span className="text-[11px] text-white/40">Energetic, modern, pacing-oriented</span>
                          </div>
                          <input 
                            type="radio" 
                            name="voice" 
                            checked={voiceSelection === 'breeze'} 
                            onChange={() => setVoiceSelection('breeze')}
                            className="text-[#FF51CB] focus:ring-[#FF51CB] accent-[#FF51CB]"
                          />
                        </label>

                        <label className={`w-full flex items-center justify-between px-4 py-3.5 border rounded-xl cursor-pointer transition-colors ${
                          voiceSelection === 'echo' 
                            ? 'bg-[#FF51CB]/5 border-[#FF51CB]/30 text-white' 
                            : 'bg-white/5 border-transparent text-white/70 hover:bg-white/10'
                        }`}>
                          <div className="flex flex-col">
                            <span className="font-semibold text-[13px]">Echo</span>
                            <span className="text-[11px] text-white/40">Calm, thoughtful, tech-centric tone</span>
                          </div>
                          <input 
                            type="radio" 
                            name="voice" 
                            checked={voiceSelection === 'echo'} 
                            onChange={() => setVoiceSelection('echo')}
                            className="text-[#FF51CB] focus:ring-[#FF51CB] accent-[#FF51CB]"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {settingsTab === 'about' && (
                  <div className="space-y-4 text-[13px] leading-[1.5] text-white/70">
                    <p>
                      **Meridian Onboarding OS** is designed by the teams at North. It functions as a modern discovery engine, bridging high-end engineering capabilities with creative studios globally.
                    </p>
                    <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-[11px] font-medium font-mono text-white/40 space-y-1">
                      <div>Build: 2026.06.25</div>
                      <div>Engine version: v1.0.4-beta</div>
                      <div>Workspace: c:\Users\USER\Downloads\Meridian</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-white/5 flex justify-end">
                <button
                  onClick={() => setShowSettings(false)}
                  className="bg-white text-black hover:bg-[#F7F7F7] font-semibold text-[13px] px-6 py-2.5 rounded-full select-none active:scale-[0.98] transition-all"
                >
                  Save Settings
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
