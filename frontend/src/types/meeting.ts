export interface Meeting {
    _id: string;
    title: string;
    createdBy: string;
    canvasData?: any;
    thumbnail?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateMeetingRequest {
    title?: string;
    canvasData?: any;
    thumbnail?: string;
}

export interface UpdateMeetingRequest {
    title?: string;
    canvasData?: any;
    thumbnail?: string;
}
