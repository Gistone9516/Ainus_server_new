/**
 * Test Help Display
 * 
 * Displays all available test commands with descriptions and usage examples.
 * Requirements: 4.1
 */

interface TestCommand {
  name: string;
  script: string;
  description: string;
  modes?: string[];
  examples: string[];
}

const testCommands: TestCommand[] = [
  {
    name: "Data Collection Pipeline",
    script: "test:pipeline",
    description: "데이터 수집 파이프라인 테스트 (Naver 뉴스, AA 모델)",
    modes: ["all", "schedule", "naver", "aa"],
    examples: [
      "npm run test:pipeline          # 전체 테스트",
      "npm run test:pipeline -- all   # 전체 테스트",
      "npm run test:pipeline -- naver # Naver 뉴스 수집만",
      "npm run test:pipeline -- aa    # AA 모델 수집만",
      "npm run test:pipeline -- schedule # 스케줄러 등록만 (수집 안함)"
    ]
  },
  {
    name: "News Clustering Pipeline",
    script: "test:clustering",
    description: "뉴스 클러스터링 파이프라인 테스트 (GPT 분류, 이슈 지수 계산)",
    examples: [
      "npm run test:clustering        # 클러스터링 파이프라인 실행"
    ]
  },
  {
    name: "News Tagging Pipeline",
    script: "test:tagging",
    description: "뉴스 태깅 파이프라인 테스트 (기사 태그 분류)",
    examples: [
      "npm run test:tagging           # 태깅 파이프라인 실행"
    ]
  },
  {
    name: "Test Help",
    script: "test:help",
    description: "사용 가능한 테스트 명령어 목록 표시",
    examples: [
      "npm run test:help              # 이 도움말 표시"
    ]
  }
];

function displayHelp(): void {
  console.log("\n" + "=".repeat(70));
  console.log("  📋 사용 가능한 테스트 명령어");
  console.log("=".repeat(70));

  testCommands.forEach((cmd, index) => {
    console.log(`\n${index + 1}. ${cmd.name}`);
    console.log("-".repeat(50));
    console.log(`   스크립트: npm run ${cmd.script}`);
    console.log(`   설명: ${cmd.description}`);
    
    if (cmd.modes && cmd.modes.length > 0) {
      console.log(`   모드: ${cmd.modes.join(", ")}`);
    }
    
    console.log("\n   사용 예시:");
    cmd.examples.forEach(example => {
      console.log(`     ${example}`);
    });
  });

  console.log("\n" + "=".repeat(70));
  console.log("  💡 팁: 각 테스트는 DB 연결이 필요합니다. .env 파일을 확인하세요.");
  console.log("=".repeat(70) + "\n");
}

if (require.main === module) {
  displayHelp();
}

export { displayHelp, testCommands, TestCommand };
