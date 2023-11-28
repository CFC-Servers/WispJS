import { WispAPICore } from "./index";
import type { PaginationData } from "./index";

export type DirectoryFile = {
  object: "file";
  attributes: {
    type: "file" | "directory";
    name: string;
    size: number;
    mime: string;
    symlink: boolean;
    created_at: string;
    modified_at: string;
  }
}

export type DirectoryContentsResponse = {
  object: "list";
  data: DirectoryFile[]
  meta: {
    pagination: PaginationData | undefined;
  }
}

export type FileReadResponse = {
  content: string;
}

export type FileWriteRequest = {
  path: string;
  content: string;
}

export type CopyFileRequest = {
  path: string;
}

export type DownloadFileResponse = {
  url: string;
}

export type RenameFileRequest = {
  path: string;
  to: string;
}

export type CompressFilesRequest = {
  paths: string[];
  to: string;
}

export class FilesystemAPI {
  constructor(private core: WispAPICore) {}

  // [GET] /api/client/servers/<UUID>/files/directory
  // TODO: Handle pagination
  async GetDirectoryContents(path: string): Promise<DirectoryContentsResponse> {
    const response = await this.core.makeRequest("GET", "files/directory", { path: path });
    return await response.json();
  }

  // [POST] /api/client/servers/<UUID>/files/directory
  async CreateDirectory(path: string): Promise<Response> {
    return await this.core.makeRequest("POST", "files/directory", { path: path });
  }

  // [GET] /api/client/servers/<UUID>/files/read
  async ReadFile(path: string): Promise<FileReadResponse> {
    const response = await this.core.makeRequest("GET", "files/read", { path: path });
    const responseData = await response.json();

    return responseData.content;
  }

  // [POST] /api/client/servers/<UUID>/files/write
  // "Overwrites the file if it already exists."
  async WriteFile(path: string, content: string): Promise<Response> {
    const data: FileWriteRequest = { path: path, content: content };
    return await this.core.makeRequest("POST", "files/write", data);
  }

  // [POST] /api/client/servers/<UUID>/files/copy
  // "New copy will be written to the same directory, with a name such as `test.txt` -> `test.txt copy-1643810941850`"
  async CopyFile(path: string): Promise<Response> {
    const data: CopyFileRequest = { path: path };
    return await this.core.makeRequest("POST", "files/copy", data);
  }

  // (Wrapper) [DELETE] /api/client/servers/<UUID>/files/delete
  async DeleteFiles(paths: string[]): Promise<Response> {
    return await this.core.makeRequest("POST", "files/delete", { paths: paths });
  }

  // [GET] /api/client/servers/<UUID>/files/download
  // "Retrieves a download URL to a file"
  async DownloadFile(path: string): Promise<DownloadFileResponse> {
    const response = await this.core.makeRequest("GET", "files/download", { path: path });
    const data: DownloadFileResponse = await response.json();

    return data;
  }

  // [GET] /api/client/servers/<UUID>/files/rename
  async RenameFile(path: string, to: string): Promise<Response> {
    const data: RenameFileRequest = { path: path, to: to };
    return await this.core.makeRequest("PUT", "files/rename", data);
  }

  // [POST] /api/client/servers/<UUID>/files/compress
  async CompressFiles(paths: string[], to: string): Promise<Response> {
    const data: CompressFilesRequest = { paths: paths, to: to };
    return await this.core.makeRequest("POST", "files/compress", data);
  }

  // [POST] /api/client/servers/<UUID>/files/decompress
  async DecompressFile(path: string): Promise<Response> {
    return await this.core.makeRequest("POST", "files/decompress", { path: path });
  }
}
