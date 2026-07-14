export const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "HikingFit API",
    description: "Dokumentasi backend API untuk HikingFit. Sudah disesuaikan 100% dengan routes dan controller terbaru.",
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
        description: "Masukkan token JWT Firebase."
      }
    },
    schemas: {
      SuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string" }
        }
      },
      Profile: {
        type: "object",
        properties: {
          fullName: { type: "string" },
          email: { type: "string" },
          height: { type: "integer" },
          weight: { type: "integer" },
          age: { type: "integer" },
          gender: { type: "string" },
          bmi: { type: "number" },
          experienceLevel: { type: "string" },
          runningPace: { type: "string" },
          exerciseFrequency: { type: "string" },
          profileImageUrl: { type: "string" }
        }
      },
      Mountain: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          location: { type: "string" },
          province: { type: "string" },
          elevation: { type: "integer" },
          difficulty: { type: "string" },
          status: { type: "string" },
          description: { type: "string" },
          imageUrl: { type: "string" },
          latitude: { type: "number" },
          longitude: { type: "number" },
          estimatedDuration: { type: "string" },
          distance: { type: "string" },
          weather: { type: "string", description: "Suhu real-time dari Open-Meteo" }
        }
      }
    }
  },
  paths: {
    // ==========================================
    // AUTH ROUTES
    // ==========================================
    "/auth/send-otp": {
      post: {
        summary: "Kirim OTP & Buat Profil Awal",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  uid: { type: "string" },
                  email: { type: "string" },
                  fullName: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Kode OTP berhasil dikirim." }
        }
      }
    },
    "/auth/verify-otp": {
      post: {
        summary: "Verifikasi Kode OTP",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  uid: { type: "string" },
                  otp: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Email terverifikasi!" }
        }
      }
    },
    "/auth/onboarding": {
      post: {
        summary: "Simpan Data Onboarding User",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  height: { type: "number" },
                  weight: { type: "number" },
                  age: { type: "number" },
                  gender: { type: "string" },
                  experienceLevel: { type: "string" },
                  runningPace: { type: "string" },
                  exerciseFrequency: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Profil disimpan!" }
        }
      }
    },
    "/auth/profile": {
      get: {
        summary: "Ambil Data Profil User",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Berhasil mengambil profil.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Profile" } } }
          }
        }
      },
      put: {
        summary: "Update Data Profil User",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  fullName: { type: "string" },
                  height: { type: "number" },
                  weight: { type: "number" },
                  age: { type: "number" },
                  gender: { type: "string" },
                  profileImageUrl: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Profil berhasil diperbarui!" }
        }
      }
    },
    "/auth/google-login": {
      post: {
        summary: "Google Sign-In (Auto Register)",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Login Google berhasil." }
        }
      }
    },

    // ==========================================
    // MOUNTAINS ROUTES
    // ==========================================
    "/mountains": {
      get: {
        summary: "Ambil Semua Gunung & Cuaca",
        tags: ["Mountains"],
        responses: {
          "200": { description: "Berhasil mengambil daftar gunung." }
        }
      },
      post: {
        summary: "Tambah Gunung Baru (Admin)",
        tags: ["Mountains"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Mountain" }
            }
          }
        },
        responses: {
          "201": { description: "Gunung berhasil ditambahkan" }
        }
      }
    },
    "/mountains/{id}": {
      get: {
        summary: "Ambil Detail 1 Gunung & Cuaca",
        tags: ["Mountains"],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Berhasil mengambil detail gunung." }
        }
      },
      put: {
        summary: "Update Data Gunung (Admin)",
        tags: ["Mountains"],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Mountain" }
            }
          }
        },
        responses: {
          "200": { description: "Data gunung berhasil diupdate" }
        }
      },
      delete: {
        summary: "Hapus Gunung (Admin)",
        tags: ["Mountains"],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Gunung berhasil dihapus" }
        }
      }
    },

    // ==========================================
    // TRAILS ROUTES
    // ==========================================
    "/trails": {
      get: {
        summary: "Ambil Daftar Jalur",
        description: "Bisa filter pakai mountainId. Jika userId dikirim, estimasi waktu akan dipersonalisasi berdasarkan level kebugaran user.",
        tags: ["Trails"],
        parameters: [
          { in: "query", name: "mountainId", schema: { type: "string" }, description: "Filter berdasarkan ID Gunung" },
          { in: "query", name: "userId", schema: { type: "string" }, description: "Kirim ID User untuk personalisasi displayTime" }
        ],
        responses: {
          "200": { description: "Berhasil mengambil daftar jalur." }
        }
      },
      post: {
        summary: "Tambah Jalur Baru (Admin)",
        tags: ["Trails"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", description: "Body jalur menyesuaikan schema Firestore" }
            }
          }
        },
        responses: {
          "201": { description: "Jalur berhasil ditambahkan" }
        }
      }
    },
    "/trails/{id}": {
      put: {
        summary: "Update Jalur (Admin)",
        tags: ["Trails"],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object" }
            }
          }
        },
        responses: {
          "200": { description: "Berhasil diupdate" }
        }
      },
      delete: {
        summary: "Hapus Jalur (Admin)",
        tags: ["Trails"],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Berhasil dihapus" }
        }
      }
    },

    // ==========================================
    // WEATHER ROUTES
    // ==========================================
    "/weather/{trailName}": {
      get: {
        summary: "Ambil Data Grafik Cuaca",
        tags: ["Weather"],
        parameters: [{ in: "path", name: "trailName", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Berhasil mengambil data cuaca." },
          "404": { description: "Data grafik cuaca belum tersedia." }
        }
      }
    }
  }
};