import { useReducer, useCallback } from 'react';
import { usePostService } from '@/api/services/community/usePostService';
import { Reply, ReplyAction, ReplyState } from "@/api/types/community/post";

const initialState: ReplyState = {
    replies: [],
    childrenMap: {},
    loadingStates: {},
    pageStates: {},
    pendingReplies: {},
    selectedReplyId: null,
    editingReplyId: null,
    replyText: '',
    isSubmitting: false,
    error: null,
    totalCount: 0,
    hasMore: true,
};

function replyReducer(state: ReplyState, action: ReplyAction): ReplyState {
    switch (action.type) {
        case 'SET_REPLIES':
            return {
                ...state,
                replies: action.page === 0 ? action.payload : [...state.replies, ...action.payload],
                totalCount: action.totalCount,
                hasMore: action.hasMore,
            };

        case 'UPDATE_CHILDREN': {
            const updatedReplies = state.replies.map(reply => {
                if (reply.id === action.payload.parentId) {
                    const existingChildren = reply.children || [];
                    const newChildren = action.payload.page === 0
                        ? action.payload.children
                        : [...existingChildren, ...action.payload.children];

                    return {
                        ...reply,
                        children: newChildren
                    };
                }
                return reply;
            });

            return {
                ...state,
                replies: updatedReplies
            };
        }
        case 'UPDATE_REPLY':
            return {
                ...state,
                replies: state.replies.map(reply => {
                    if (reply.id === action.payload.id) {
                        return { ...reply, content: action.payload.content };
                    }
                    if (reply.children) {
                        return {
                            ...reply,
                            children: reply.children.map(child =>
                                child.id === action.payload.id
                                    ? { ...child, content: action.payload.content }
                                    : child
                            ),
                        };
                    }
                    return reply;
                }),
            };
        case 'UPDATE_CHILDREN': {
            const { parentId, children, page } = action.payload;

            return {
                ...state,
                replies: state.replies.map(reply => {
                    if (reply.id === parentId) {
                        // 기존 자식 답글 배열
                        const existingChildren = reply.children || [];

                        // 새로운 자식 답글들 중 중복되지 않는 것만 필터링
                        const newChildrenFiltered = children.filter(
                            newChild => !existingChildren.some(
                                existing => existing.id === newChild.id
                            )
                        );

                        // 기존 답글과 새로운 답글 합치기
                        const mergedChildren = [...existingChildren, ...newChildrenFiltered];

                        return {
                            ...reply,
                            children: mergedChildren,
                            childCount: reply.childCount // 원래 childCount 유지
                        };
                    }
                    return reply;
                })
            };
        }
        case 'DELETE_REPLY':
            return {
                ...state,
                replies: state.replies.filter(reply => {
                    if (reply.id === action.payload) return false;
                    if (reply.children) {
                        reply.children = reply.children.filter(
                            child => child.id !== action.payload
                        );
                    }
                    return true;
                }),
            };
        case 'SET_CHILDREN':
            return {
                ...state,
                childrenMap: {
                    ...state.childrenMap,
                    [action.payload.parentId]: action.payload.children,
                },
            };
        case 'SET_LOADING':
            return {
                ...state,
                loadingStates: {
                    ...state.loadingStates,
                    [action.payload.replyId]: action.payload.isLoading,
                },
            };
        case 'SET_PAGE':
            return {
                ...state,
                pageStates: {
                    ...state.pageStates,
                    [action.payload.replyId]: action.payload.page,
                },
            };
        case 'SELECT_REPLY':
            return {
                ...state,
                selectedReplyId: action.payload,
                editingReplyId: null,
            };
        case 'SET_EDITING':
            return {
                ...state,
                editingReplyId: action.payload,
                selectedReplyId: null,
            };
        case 'SET_REPLY_TEXT':
            return {
                ...state,
                replyText: action.payload,
            };
        case 'SET_SUBMITTING':
            return {
                ...state,
                isSubmitting: action.payload,
            };
        case 'SET_ERROR':
            return {
                ...state,
                error: action.payload,
            };
        default:
            return state;
    }
}

export const useReplyState = (postId: string) => {
    const [state, dispatch] = useReducer(replyReducer, initialState);
    const postService = usePostService();

    const fetchReplies = useCallback(async (page = 0) => {
        try {
            const response = await postService.fetchReplies(postId, page);

            dispatch({
                type: 'SET_REPLIES',
                payload: response.content,
                totalCount: response.totalElements,
                hasMore: !response.last,
                page
            });
            return response;
        } catch (error) {
            console.error('Error fetching replies:', error);
            dispatch({ type: 'SET_ERROR', payload: error as Error });
            throw error;
        }
    }, [postId]);

    const fetchChildReplies = useCallback(async (parentId: number, page = 0) => {
        dispatch({ type: 'SET_LOADING', payload: { replyId: parentId, isLoading: true } });

        try {
            const response = await postService.fetchChildReplies(parentId, page);

            dispatch({
                type: 'UPDATE_CHILDREN',
                payload: {
                    parentId,
                    children: response.content,
                    page
                }
            });

            dispatch({ type: 'SET_PAGE', payload: { replyId: parentId, page } });
            return true;
        } catch (error) {
            console.error('Error fetching child replies:', error);
            dispatch({ type: 'SET_ERROR', payload: error as Error });
            return false;
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { replyId: parentId, isLoading: false } });
        }
    }, [postService]);

    const createReply = useCallback(async (content: string, parentId?: number | null) => {
        dispatch({ type: 'SET_SUBMITTING', payload: true });
        const tempId = Date.now();

        const optimisticReply: Reply = {
            id: tempId,
            content,
            userId: 0,
            userNickname: '작성 중...',
            createdAt: new Date().toISOString(),
            isWriter: true,
            childCount: 0,
            parentId
        };

        dispatch({ type: 'ADD_REPLY', payload: optimisticReply });

        try {
            await postService.createReply(postId, content, parentId);
            await fetchReplies(0);
            dispatch({ type: 'SET_REPLY_TEXT', payload: '' });
            dispatch({ type: 'SELECT_REPLY', payload: null });
        } catch (error) {
            dispatch({ type: 'DELETE_REPLY', payload: tempId });
            dispatch({ type: 'SET_ERROR', payload: error as Error });
            throw error;
        } finally {
            dispatch({ type: 'SET_SUBMITTING', payload: false });
        }
    }, [postId]);

    const updateReply = useCallback(async (replyId: number, content: string) => {
        dispatch({ type: 'SET_SUBMITTING', payload: true });
        const originalContent = state.replies.find(r => r.id === replyId)?.content;

        dispatch({ type: 'UPDATE_REPLY', payload: { id: replyId, content } });

        try {
            await postService.updateReply(replyId, content);
            dispatch({ type: 'SET_REPLY_TEXT', payload: '' });
            dispatch({ type: 'SET_EDITING', payload: null });
        } catch (error) {
            if (originalContent) {
                dispatch({ type: 'UPDATE_REPLY', payload: { id: replyId, content: originalContent } });
            }
            dispatch({ type: 'SET_ERROR', payload: error as Error });
            throw error;
        } finally {
            dispatch({ type: 'SET_SUBMITTING', payload: false });
        }
    }, [state.replies]);

    const deleteReply = useCallback(async (replyId: number) => {
        // 상위 댓글과 대댓글 모두에서 찾기
        const replyToDelete = state.replies.reduce<Reply | undefined>((found, reply) => {
            if (found) return found;
            if (reply.id === replyId) return reply;
            // 대댓글 검색
            if (reply.children) {
                const childReply = reply.children.find(child => child.id === replyId);
                if (childReply) return childReply;
            }
            return found;
        }, undefined);

        if (!replyToDelete) {
            console.error('Reply not found:', replyId);
            return;
        }

        dispatch({ type: 'DELETE_REPLY', payload: replyId });

        try {
            await postService.deleteReply(replyId);
        } catch (error) {
            if (replyToDelete) {
                dispatch({ type: 'ADD_REPLY', payload: replyToDelete });
            }
            dispatch({ type: 'SET_ERROR', payload: error as Error });
            throw error;
        }
    }, [state.replies]);

    return {
        state,
        actions: {
            fetchReplies,
            fetchChildReplies,
            createReply,
            updateReply,
            deleteReply,
            selectReply: (id: number | null) => dispatch({ type: 'SELECT_REPLY', payload: id }),
            setEditing: (id: number | null) => dispatch({ type: 'SET_EDITING', payload: id }),
            setReplyText: (text: string) => dispatch({ type: 'SET_REPLY_TEXT', payload: text }),
        },
    };
};