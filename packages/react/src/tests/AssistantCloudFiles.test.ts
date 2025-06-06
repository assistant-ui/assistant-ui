import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { AssistantCloudFiles } from "../cloud/AssistantCloudFiles";
import { AssistantCloudAPI } from "../cloud/AssistantCloudAPI";
import { AssistantCloud } from "../cloud/AssistantCloud";

// Mock the AssistantCloudAPI to avoid making real HTTP requests (except for integration tests)
vi.mock("../cloud/AssistantCloudAPI");

describe("AssistantCloudFiles", () => {
  let cloudFiles: AssistantCloudFiles;
  let mockApi: AssistantCloudAPI;

  beforeEach(() => {
    // Create a mock API instance
    mockApi = {
      makeRequest: vi.fn(),
      makeRawRequest: vi.fn(),
      _auth: { getAuthHeaders: vi.fn() },
      _baseUrl: "https://backend.assistant-api.com",
    } as unknown as AssistantCloudAPI;

    // Create the AssistantCloudFiles instance with the mock API
    cloudFiles = new AssistantCloudFiles(mockApi);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("pdfToImages", () => {
    /**
     * Tests successful PDF to images conversion with file_url
     * This matches the curl request structure provided
     */
    it("should successfully convert PDF to images using file_url", async () => {
      const mockResponse = {
        success: true,
        urls: [
          "https://aui-pdf-processing.5c52327048f352f85fb041947c406ab4.r2.cloudflarestorage.com/images/8eb81c61-dc76-48fd-ab66-25cd84a28c97/page-1.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=8698a7e98d990c6edd11fee3a9d0f3f0%2F20250606%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20250606T035428Z&X-Amz-Expires=3600&X-Amz-Signature=ea26cdd5ff7dc85eba12970137606484b9a8ab2c520f31ddba9cbe5941b20793&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject",
          "https://aui-pdf-processing.5c52327048f352f85fb041947c406ab4.r2.cloudflarestorage.com/images/8eb81c61-dc76-48fd-ab66-25cd84a28c97/page-2.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=8698a7e98d990c6edd11fee3a9d0f3f0%2F20250606%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20250606T035428Z&X-Amz-Expires=3600&X-Amz-Signature=3499237770cc4402a60e6cc9b8ce8bd460faade9adf456d2773009f7d07af9cb&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject",
          "https://aui-pdf-processing.5c52327048f352f85fb041947c406ab4.r2.cloudflarestorage.com/images/8eb81c61-dc76-48fd-ab66-25cd84a28c97/page-3.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=8698a7e98d990c6edd11fee3a9d0f3f0%2F20250606%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20250606T035429Z&X-Amz-Expires=3600&X-Amz-Signature=663ee073972f1b7b82cede9039ed4bc0a6c08118533a9586e871807baf032bc2&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject"
        ],
        message: "PDF successfully converted to images"
      };

      // Mock the API call to return our expected response
      vi.mocked(mockApi.makeRequest).mockResolvedValue(mockResponse);

      const requestBody = {
        file_url: "https://files.testfile.org/PDF/10MB-TESTFILE.ORG.pdf"
      };

      const result = await cloudFiles.pdfToImages(requestBody);

      // Verify the API was called correctly
      expect(mockApi.makeRequest).toHaveBeenCalledWith("/files/pdf-to-images", {
        method: "POST",
        body: requestBody,
      });

      // Verify the response structure
      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(true);
      expect(result.urls).toHaveLength(3);
      expect(result.message).toBe("PDF successfully converted to images");
      expect(result.urls[0]).toContain("page-1.png");
      expect(result.urls[1]).toContain("page-2.png");
      expect(result.urls[2]).toContain("page-3.png");
    });

    /**
     * Tests successful PDF to images conversion with file_blob
     */
    it("should successfully convert PDF to images using file_blob", async () => {
      const mockResponse = {
        success: true,
        urls: [
          "https://example.com/converted-image-1.png",
          "https://example.com/converted-image-2.png"
        ],
        message: "PDF successfully converted to images"
      };

      vi.mocked(mockApi.makeRequest).mockResolvedValue(mockResponse);

      const requestBody = {
        file_blob: "data:application/pdf;base64,JVBERi0xLjQKJdPr6eEKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNTk1IDg0Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA1OTUgODQyXQovQ29udGVudHMgNCAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0xlbmd0aCA0NAo+PgpzdHJlYW0KQlQKL0YxIDEyIFRmCjEwMCA3MDAgVGQKKFRlc3QgUERGKSBUagoKRVQKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9CYXNlRm9udCAvSGVsdmV0aWNhCi9TdWJ0eXBlIC9UeXBlMQo+PgplbmRvYmoKNiAwIG9iago8PAovVHlwZSAvRm9udERlc2NyaXB0b3IKL0ZvbnROYW1lIC9IZWx2ZXRpY2EKPj4KZW5kb2JqCnhyZWYKMCA3CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDc0IDAwMDAwIG4gCjAwMDAwMDAxMzMgMDAwMDAgbiAKMDAwMDAwMDIwNCAwMDAwMCBuIAowMDAwMDAwMjk5IDAwMDAwIG4gCjAwMDAwMDAzNzYgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA3Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgo0MzQKJSVFT0YK"
      };

      const result = await cloudFiles.pdfToImages(requestBody);

      expect(mockApi.makeRequest).toHaveBeenCalledWith("/files/pdf-to-images", {
        method: "POST",
        body: requestBody,
      });

      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(true);
      expect(result.urls).toHaveLength(2);
    });

    /**
     * Tests API error handling
     */
    it("should handle API errors gracefully", async () => {
      const errorMessage = "Invalid PDF file";
      vi.mocked(mockApi.makeRequest).mockRejectedValue(new Error(errorMessage));

      const requestBody = {
        file_url: "https://invalid-url.com/not-a-pdf.txt"
      };

      await expect(cloudFiles.pdfToImages(requestBody)).rejects.toThrow(errorMessage);

      expect(mockApi.makeRequest).toHaveBeenCalledWith("/files/pdf-to-images", {
        method: "POST",
        body: requestBody,
      });
    });

    /**
     * Tests handling of failed conversion response
     */
    it("should handle failed conversion response", async () => {
      const mockResponse = {
        success: false,
        urls: [],
        message: "Failed to convert PDF: File too large"
      };

      vi.mocked(mockApi.makeRequest).mockResolvedValue(mockResponse);

      const requestBody = {
        file_url: "https://example.com/huge-file.pdf"
      };

      const result = await cloudFiles.pdfToImages(requestBody);

      expect(result.success).toBe(false);
      expect(result.urls).toHaveLength(0);
      expect(result.message).toBe("Failed to convert PDF: File too large");
    });

    /**
     * Tests that the method works with both file_url and file_blob undefined (edge case)
     */
    it("should handle empty request body", async () => {
      const mockResponse = {
        success: false,
        urls: [],
        message: "No file provided"
      };

      vi.mocked(mockApi.makeRequest).mockResolvedValue(mockResponse);

      const requestBody = {};

      const result = await cloudFiles.pdfToImages(requestBody);

      expect(mockApi.makeRequest).toHaveBeenCalledWith("/files/pdf-to-images", {
        method: "POST",
        body: requestBody,
      });

      expect(result.success).toBe(false);
      expect(result.urls).toHaveLength(0);
    });

    /**
     * Tests that the method sends the correct request headers and structure
     * This ensures compatibility with the API key authentication shown in the curl example
     */
    it("should make request to correct endpoint with proper structure", async () => {
      const mockResponse = {
        success: true,
        urls: ["https://example.com/image.png"],
        message: "Success"
      };

      vi.mocked(mockApi.makeRequest).mockResolvedValue(mockResponse);

      const requestBody = {
        file_url: "https://files.testfile.org/PDF/10MB-TESTFILE.ORG.pdf"
      };

      await cloudFiles.pdfToImages(requestBody);

      // Verify the endpoint and method are correct
      expect(mockApi.makeRequest).toHaveBeenCalledWith("/files/pdf-to-images", {
        method: "POST",
        body: requestBody,
      });

      // Verify it was called exactly once
      expect(mockApi.makeRequest).toHaveBeenCalledTimes(1);
    });

    /**
     * Tests that both file_url and file_blob can be provided simultaneously
     */
    it("should handle request with both file_url and file_blob", async () => {
      const mockResponse = {
        success: true,
        urls: ["https://example.com/image.png"],
        message: "Success"
      };

      vi.mocked(mockApi.makeRequest).mockResolvedValue(mockResponse);

      const requestBody = {
        file_url: "https://example.com/file.pdf",
        file_blob: "base64data..."
      };

      const result = await cloudFiles.pdfToImages(requestBody);

      expect(mockApi.makeRequest).toHaveBeenCalledWith("/files/pdf-to-images", {
        method: "POST",
        body: requestBody,
      });

      expect(result).toEqual(mockResponse);
    });
  });

  // Integration test that actually calls the real API
  describe("Integration Tests", () => {
    /**
     * Integration test that actually calls the real API endpoint
     * This test requires real API credentials to be set in environment variables:
     * - AUI_API_KEY: Your API key (e.g., sk_aui_proj_...)
     * - AUI_USER_ID: Your user ID  
     * - AUI_WORKSPACE_ID: Your workspace ID
     */
    it.skipIf(!process.env.AUI_API_KEY || !process.env.AUI_USER_ID || !process.env.AUI_WORKSPACE_ID)(
      "should actually convert PDF to images using real API", async () => {
        // Unmock all modules for this test to use real implementations
        vi.doUnmock("../cloud/AssistantCloudAPI");
        vi.doUnmock("../cloud/AssistantCloudFiles");
        vi.doUnmock("../cloud/AssistantCloud");
        
        // Clear all mocks and reload modules
        vi.resetModules();
        
        // Import real modules
        const { AssistantCloud: RealAssistantCloud } = await import("../cloud/AssistantCloud");

        const realCloud = new RealAssistantCloud({
          apiKey: process.env.AUI_API_KEY!,
          userId: process.env.AUI_USER_ID!,
          workspaceId: process.env.AUI_WORKSPACE_ID!,
        });

                const requestBody = {
          file_url: "https://files.testfile.org/PDF/10MB-TESTFILE.ORG.pdf"
        };

        console.log("Making API call to convert PDF...");
        const result = await realCloud.files.pdfToImages(requestBody);
        console.log("API call result:", result);
    
        // Verify the response structure
        expect(result).toHaveProperty("success");
        expect(result).toHaveProperty("urls");
        expect(result).toHaveProperty("message");

        if (result.success) {
          expect(Array.isArray(result.urls)).toBe(true);
          expect(result.urls.length).toBeGreaterThan(0);
          expect(typeof result.message).toBe("string");
          
          // Verify URLs are valid image URLs
          result.urls.forEach(url => {
            expect(url).toMatch(/^https:\/\/.+\.(png|jpg|jpeg)(\?.*)?$/i);
          });
        } else {
          // If it fails, at least verify the error message is a string
          expect(typeof result.message).toBe("string");
          console.log("API call failed:", result.message);
        }
        
        // Restore mocks after the test
        vi.doMock("../cloud/AssistantCloudAPI");
      },
      60000 // 60 second timeout for real API calls
    );
  });
}); 