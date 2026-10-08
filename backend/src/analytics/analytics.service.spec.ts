import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { AnalyticsService } from "./analytics.service";
import { AnalyticsEvent } from "./analytics.entity";

const mockRepo = {
  create: jest.fn((e) => e),
  save: jest.fn(async (e) => ({ id: "evt-1", ...e })),
  find: jest.fn(async () => []),
};

describe("AnalyticsService", () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getRepositoryToken(AnalyticsEvent), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("create() persiste el evento con userId opcional", async () => {
    const dto = {
      event: "product_view",
      page: "/product/TS-9482",
      productId: "TS-9482",
    };
    const saved = await service.create(dto, "user-1");
    expect(mockRepo.create).toHaveBeenCalledWith({ ...dto, userId: "user-1" });
    expect(saved).toMatchObject({ event: "product_view", userId: "user-1" });
  });

  it("create() guarda sin userId si no viene auth", async () => {
    const dto = { event: "login" };
    await service.create(dto);
    expect(mockRepo.create).toHaveBeenCalledWith({ ...dto, userId: undefined });
  });

  it("findRecent() limita entre 1 y 500", async () => {
    const findMock = mockRepo.find as jest.Mock;
    await service.findRecent(1000);
    expect(findMock.mock.calls[0][0].take).toBe(500);
    findMock.mockClear();
    await service.findRecent(1);
    expect(findMock.mock.calls[0][0].take).toBe(1);
  });
});
