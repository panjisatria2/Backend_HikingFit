export const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "HikingFit API",
    description: "Dokumentasi backend API untuk HikingFit. Didesain dengan struktur respons yang konsisten agar mudah dikonsumsi dan diubah menjadi model.",
    version: "1.0.0",
    contact: {
      name: "Backend Team"
    }
  },
  servers: [
    { url: "https://backend-hiking-fit.vercel.app/api", description: "Production Server" },
    { url: "http://localhost:5000/api", description: "Local Development Server" }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Masukkan token JWT/Firebase dari proses login."
      }
    },
    schemas: {
      SuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Operasi berhasil" }
        }
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Pesan error untuk frontend" }
        }
      },
      Mountain: {
        type: "object",
        properties: {
          id: { type: "string", example: "MNT-001" },
          name: { type: "string", example: "Gunung Rinjani" },
          elevation: { type: "integer", example: 3726 },
          location: { type: "string", example: "Lombok, Nusa Tenggara Barat" }
        }
      },
      Trail: {
        type: "object",
        properties: {
          id: { type: "string", example: "TRL-001" },
          mountainId: { type: "string", example: "MNT-001" },
          name: { type: "string", example: "Jalur Sembalun" },
          difficulty: { type: "string", example: "Hard" }
        }
      },
      Weather: {
        type: "object",
        properties: {
          mountainId: { type: "string", example: "MNT-001" },
          condition: { type: "string", example: "Cerah Berawan" },
          temperature: { type: "integer", example: 18 },
          lastUpdated: { type: "string", format: "date-time" }
        }
      }
    }
  },
  security: [
    { bearerAuth: [] }
  ],
  paths: {
    "/auth/login": {
      post: {
        summary: "Login Pengguna",
        tags: ["Auth"],
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string" },
                  password: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Login berhasil, mengembalikan token.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6..." }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/mountains": {
      get: {
        summary: "Ambil Semua Data Gunung",
        tags: ["Mountains"],
        responses: {
          "200": {
            description: "Berhasil mengambil daftar gunung.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Mountain" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/mountains/{id}": {
      get: {
        summary: "Ambil Detail Gunung Berdasarkan ID",
        tags: ["Mountains"],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": {
            description: "Berhasil mengambil detail gunung.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/Mountain" }
                  }
                }
              }
            }
          },
          "404": {
            description: "Gunung tidak ditemukan",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/trails/mountain/{mountainId}": {
      get: {
        summary: "Ambil Jalur Pendakian Berdasarkan ID Gunung",
        tags: ["Trails"],
        parameters: [
          { in: "path", name: "mountainId", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": {
            description: "Berhasil mengambil daftar jalur.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Trail" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/weather/{mountainId}": {
      get: {
        summary: "Ambil Data Cuaca Pakar",
        description: "Mengambil data cuaca terbaru untuk gunung tertentu.",
        tags: ["Weather"],
        parameters: [
          { in: "path", name: "mountainId", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": {
            description: "Berhasil mengambil data cuaca.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/Weather" }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};