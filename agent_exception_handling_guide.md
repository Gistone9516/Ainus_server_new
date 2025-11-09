# Agent AI 메서드 단위 정규화된 예외 처리 전략

## 목표
- 각 메서드마다 독립적인 예외 처리로 **문제 발생 지점 명확화**
- 오류 발생 시 **해당 메서드만 수정** 가능하도록 설계
- **전체 작업 실패 최소화** (부분 성공 지원)

---

## 1. 예외 클래스 계층 구조

```python
class AgentException(Exception):
    """Agent 작업 기본 예외"""
    def __init__(self, code: str, message: str, method: str, retry_able: bool = False):
        self.code = code
        self.message = message
        self.method = method  # 문제 발생 메서드
        self.retry_able = retry_able
        self.timestamp = datetime.now()

    def to_dict(self):
        return {
            "error_code": self.code,
            "error_message": self.message,
            "failed_method": self.method,
            "retry_possible": self.retry_able,
            "timestamp": self.timestamp.isoformat()
        }


# 세부 예외 클래스
class ValidationException(AgentException):
    """입력 검증 실패"""
    def __init__(self, message: str, method: str):
        super().__init__("VALIDATION_ERROR", message, method, retry_able=False)


class ExternalAPIException(AgentException):
    """외부 API 호출 실패"""
    def __init__(self, message: str, method: str, status_code: int = None):
        super().__init__("API_ERROR", message, method, retry_able=True)
        self.status_code = status_code


class DatabaseException(AgentException):
    """데이터베이스 작업 실패"""
    def __init__(self, message: str, method: str):
        super().__init__("DB_ERROR", message, method, retry_able=True)


class AuthenticationException(AgentException):
    """인증/권한 오류"""
    def __init__(self, message: str, method: str):
        super().__init__("AUTH_ERROR", message, method, retry_able=False)


class TimeoutException(AgentException):
    """타임아웃 발생"""
    def __init__(self, message: str, method: str):
        super().__init__("TIMEOUT_ERROR", message, method, retry_able=True)


class RateLimitException(AgentException):
    """Rate limit 초과"""
    def __init__(self, message: str, method: str, retry_after: int = 30):
        super().__init__("RATE_LIMIT_ERROR", message, method, retry_able=True)
        self.retry_after = retry_after
```

---

## 2. 메서드 단위 예외 처리 패턴

### 기본 구조

```python
def method_name(params) -> Result:
    """
    메서드 설명
    
    Raises:
        ValidationException: 입력 검증 실패
        ExternalAPIException: API 호출 실패
        DatabaseException: DB 작업 실패
    """
    method_name_str = "method_name"
    
    # 1단계: 입력 검증
    try:
        _validate_inputs(params, method_name_str)
    except ValidationException:
        raise
    except Exception as e:
        raise ValidationException(f"검증 중 오류: {str(e)}", method_name_str)
    
    # 2단계: 비즈니스 로직
    try:
        result = _execute_logic(params, method_name_str)
    except Exception as e:
        raise AgentException("LOGIC_ERROR", f"로직 실행 실패: {str(e)}", method_name_str)
    
    # 3단계: 결과 저장 (선택)
    try:
        _save_result(result, method_name_str)
    except DatabaseException:
        raise
    except Exception as e:
        raise DatabaseException(f"결과 저장 실패: {str(e)}", method_name_str)
    
    return result
```

---

## 3. 실제 구현 예시

### 3-1. 데이터 수집 메서드

```python
def fetch_model_updates() -> dict:
    """
    외부 API에서 AI 모델 업데이트 정보 수집
    
    Returns:
        dict: {"success": bool, "data": list, "errors": list}
    
    Raises:
        ValidationException: API key 검증 실패
        ExternalAPIException: API 호출 실패
        TimeoutException: 요청 시간 초과
    """
    method_name = "fetch_model_updates"
    
    # 1단계: 입력 검증 (API key, 엔드포인트)
    try:
        api_key = os.getenv("ARTIFICIAL_ANALYSIS_API_KEY")
        if not api_key:
            raise ValidationException("API key 누락", method_name)
    except Exception as e:
        raise ValidationException(f"API key 검증 실패: {str(e)}", method_name)
    
    # 2단계: API 호출
    try:
        response = requests.get(
            url="https://api.artificialanalysis.ai/models/updates",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=30
        )
        
        if response.status_code == 401:
            raise AuthenticationException("API key 무효", method_name)
        
        if response.status_code == 429:
            raise RateLimitException("Rate limit 초과", method_name, retry_after=60)
        
        if response.status_code >= 500:
            raise ExternalAPIException(
                f"서버 오류: {response.status_code}",
                method_name,
                response.status_code
            )
        
        response.raise_for_status()
        
    except requests.Timeout:
        raise TimeoutException("API 요청 타임아웃 (30초)", method_name)
    except ExternalAPIException:
        raise
    except Exception as e:
        raise ExternalAPIException(f"API 호출 실패: {str(e)}", method_name)
    
    # 3단계: 응답 데이터 파싱
    try:
        data = response.json()
        if not isinstance(data.get("models"), list):
            raise ValueError("응답 포맷 오류")
        models = data["models"]
    except Exception as e:
        raise ExternalAPIException(f"응답 파싱 실패: {str(e)}", method_name)
    
    # 4단계: 데이터 유효성 확인
    try:
        validated_models = []
        errors = []
        
        for model in models:
            try:
                validated_models.append({
                    "model_id": model["model_id"],
                    "version": model["latest_version"],
                    "update_date": model["update_date"]
                })
            except KeyError as e:
                errors.append({
                    "model": model.get("model_id", "unknown"),
                    "error": f"필드 누락: {str(e)}"
                })
        
        if not validated_models:
            raise ValidationException("유효한 모델 데이터 없음", method_name)
    
    except ValidationException:
        raise
    except Exception as e:
        raise ValidationException(f"데이터 유효성 검사 실패: {str(e)}", method_name)
    
    return {
        "success": len(errors) == 0,
        "data": validated_models,
        "errors": errors
    }
```

### 3-2. 데이터 저장 메서드

```python
def save_model_updates(updates: list) -> dict:
    """
    수집한 모델 업데이트를 데이터베이스에 저장
    
    Args:
        updates: [{"model_id": str, "version": str, "update_date": str}, ...]
    
    Returns:
        dict: {"success": bool, "saved": int, "errors": list}
    
    Raises:
        ValidationException: 입력 데이터 검증 실패
        DatabaseException: DB 작업 실패
    """
    method_name = "save_model_updates"
    
    # 1단계: 입력 검증
    try:
        if not isinstance(updates, list):
            raise ValidationException("updates는 list 타입이어야 함", method_name)
        if len(updates) == 0:
            raise ValidationException("업데이트 데이터가 비어있음", method_name)
        
        for i, update in enumerate(updates):
            if not all(k in update for k in ["model_id", "version", "update_date"]):
                raise ValidationException(f"항목 {i}: 필수 필드 누락", method_name)
    
    except ValidationException:
        raise
    except Exception as e:
        raise ValidationException(f"입력 검증 실패: {str(e)}", method_name)
    
    # 2단계: DB 연결
    db_connection = None
    try:
        db_connection = get_db_connection()
    except Exception as e:
        raise DatabaseException(f"DB 연결 실패: {str(e)}", method_name)
    
    # 3단계: 트랜잭션 시작
    saved_count = 0
    errors = []
    
    try:
        for update in updates:
            try:
                # 기존 모델 확인
                existing_model = db_connection.query(
                    "SELECT id FROM ai_models WHERE model_code = %s",
                    (update["model_id"],)
                )
                
                if not existing_model:
                    # 새 모델 생성
                    db_connection.execute(
                        "INSERT INTO ai_models (model_code, created_at) VALUES (%s, NOW())",
                        (update["model_id"],)
                    )
                    model_id = db_connection.last_insert_id()
                else:
                    model_id = existing_model[0]["id"]
                
                # 업데이트 정보 저장
                db_connection.execute(
                    """INSERT INTO model_updates 
                       (model_id, version_after, update_date, created_at)
                       VALUES (%s, %s, %s, NOW())
                    """,
                    (model_id, update["version"], update["update_date"])
                )
                
                saved_count += 1
            
            except Exception as e:
                errors.append({
                    "model_id": update["model_id"],
                    "error": str(e)
                })
    
    except Exception as e:
        # 트랜잭션 롤백
        try:
            db_connection.rollback()
        except:
            pass
        raise DatabaseException(f"트랜잭션 실행 실패: {str(e)}", method_name)
    
    # 4단계: 커밋
    try:
        db_connection.commit()
    except Exception as e:
        raise DatabaseException(f"DB 커밋 실패: {str(e)}", method_name)
    finally:
        try:
            db_connection.close()
        except:
            pass
    
    return {
        "success": len(errors) == 0,
        "saved": saved_count,
        "errors": errors
    }
```

### 3-3. 알림 발송 메서드

```python
def send_notifications(user_subscriptions: list) -> dict:
    """
    구독 사용자에게 푸시 알림 발송
    
    Args:
        user_subscriptions: [{"user_id": int, "model_id": int, "fcm_token": str}, ...]
    
    Returns:
        dict: {"success": bool, "sent": int, "failed": int}
    
    Raises:
        ValidationException: 입력 데이터 검증 실패
        ExternalAPIException: FCM API 호출 실패
    """
    method_name = "send_notifications"
    
    # 1단계: 입력 검증
    try:
        if not isinstance(user_subscriptions, list):
            raise ValidationException("입력은 list 타입이어야 함", method_name)
        if len(user_subscriptions) == 0:
            return {"success": True, "sent": 0, "failed": 0}
    
    except ValidationException:
        raise
    
    # 2단계: FCM 클라이언트 초기화
    try:
        fcm = get_fcm_client()
    except Exception as e:
        raise ExternalAPIException(f"FCM 클라이언트 초기화 실패: {str(e)}", method_name)
    
    # 3단계: 알림 발송 (개별 처리)
    sent_count = 0
    failed_count = 0
    
    for subscription in user_subscriptions:
        try:
            # 입력 검증
            if not all(k in subscription for k in ["user_id", "fcm_token"]):
                failed_count += 1
                continue
            
            # FCM 발송
            response = fcm.send(
                message={
                    "token": subscription["fcm_token"],
                    "notification": {
                        "title": "새로운 AI 모델 업데이트",
                        "body": "관심 모델에 새로운 버전이 출시되었습니다"
                    },
                    "data": {"model_id": str(subscription.get("model_id", ""))}
                },
                timeout=10
            )
            
            sent_count += 1
        
        except TimeoutError:
            failed_count += 1
            log_warning(f"FCM 타임아웃: user_id={subscription.get('user_id')}")
        
        except Exception as e:
            failed_count += 1
            log_warning(f"FCM 발송 실패: user_id={subscription.get('user_id')}, error={str(e)}")
    
    return {
        "success": failed_count == 0,
        "sent": sent_count,
        "failed": failed_count
    }
```

---

## 4. 메서드 체이닝 (작업 흐름)

```python
def execute_update_workflow() -> dict:
    """
    전체 업데이트 작업 흐름 (개별 예외 처리)
    
    Returns:
        dict: 각 메서드별 결과 + 전체 상태
    """
    workflow_id = str(uuid.uuid4())
    results = {
        "workflow_id": workflow_id,
        "timestamp": datetime.now().isoformat(),
        "steps": {}
    }
    
    # Step 1: 데이터 수집
    try:
        results["steps"]["fetch"] = fetch_model_updates()
        updates = results["steps"]["fetch"]["data"]
    except AgentException as e:
        results["steps"]["fetch"] = {
            "success": False,
            "error": e.to_dict()
        }
        log_error(f"[{workflow_id}] Step 1 실패: {e.code}", e)
        # 이 단계 실패 시 이후 단계는 스킵
        return results
    except Exception as e:
        results["steps"]["fetch"] = {
            "success": False,
            "error": {"code": "UNKNOWN_ERROR", "message": str(e)}
        }
        return results
    
    # Step 2: 데이터 저장
    try:
        results["steps"]["save"] = save_model_updates(updates)
    except AgentException as e:
        results["steps"]["save"] = {
            "success": False,
            "error": e.to_dict()
        }
        log_error(f"[{workflow_id}] Step 2 실패: {e.code}", e)
        # Step 2 실패해도 Step 3 진행 가능 (부분 성공)
    
    # Step 3: 알림 발송 (Step 2 성공 시만)
    if results["steps"]["save"].get("success", False):
        try:
            user_subs = get_subscribed_users()
            results["steps"]["notify"] = send_notifications(user_subs)
        except AgentException as e:
            results["steps"]["notify"] = {
                "success": False,
                "error": e.to_dict()
            }
            log_error(f"[{workflow_id}] Step 3 실패: {e.code}", e)
    else:
        results["steps"]["notify"] = {
            "success": False,
            "skipped": True,
            "reason": "Step 2 실패로 인한 스킵"
        }
    
    # 전체 워크플로우 상태 판단
    results["overall_success"] = all(
        step.get("success", False) 
        for step in results["steps"].values()
        if not step.get("skipped")
    )
    
    return results
```

---

## 5. 에러 로깅 및 모니터링

```python
def log_error(workflow_id: str, exception: AgentException):
    """메서드별 예외를 구조화된 형식으로 로깅"""
    log_entry = {
        "workflow_id": workflow_id,
        "timestamp": datetime.now().isoformat(),
        "error_code": exception.code,
        "error_message": exception.message,
        "failed_method": exception.method,
        "retry_possible": exception.retry_able,
        "severity": _determine_severity(exception),
        "action_required": _determine_action(exception)
    }
    
    logger.error(json.dumps(log_entry, ensure_ascii=False))
    
    # 중대 오류는 즉시 알림
    if log_entry["severity"] == "critical":
        send_admin_alert(log_entry)


def _determine_severity(exception: AgentException) -> str:
    """예외 심각도 판단"""
    if isinstance(exception, AuthenticationException):
        return "critical"  # 즉시 조치 필요
    elif isinstance(exception, DatabaseException):
        return "high"  # 운영팀 확인 필요
    elif isinstance(exception, ExternalAPIException):
        return "medium"  # 재시도 대기
    elif isinstance(exception, ValidationException):
        return "low"  # 사용자 입력 재요청
    return "unknown"


def _determine_action(exception: AgentException) -> str:
    """필요한 조치 판단"""
    if isinstance(exception, ValidationException):
        return "fix_input"  # 입력 데이터 수정
    elif exception.retry_able:
        return "retry"  # 자동 재시도
    elif isinstance(exception, AuthenticationException):
        return "update_credentials"  # 인증 정보 업데이트
    elif isinstance(exception, DatabaseException):
        return "check_db_connection"  # DB 연결 확인
    return "investigate"
```

---

## 6. 재시도 로직 (자동 복구)

```python
def execute_with_retry(func, max_retries=3, method_name="unknown"):
    """
    메서드 단위 자동 재시도
    
    Args:
        func: 실행할 메서드
        max_retries: 최대 재시도 횟수
        method_name: 메서드 이름 (로깅용)
    
    Returns:
        메서드 실행 결과
    """
    retry_count = 0
    last_exception = None
    
    while retry_count < max_retries:
        try:
            return func()
        
        except TimeoutException as e:
            retry_count += 1
            wait_time = 5 * (2 ** (retry_count - 1))  # 5s, 10s, 20s
            log_warning(f"[{method_name}] 재시도 {retry_count}/{max_retries} "
                       f"({wait_time}초 대기)")
            time.sleep(wait_time)
            last_exception = e
        
        except RateLimitException as e:
            retry_count += 1
            wait_time = e.retry_after
            log_warning(f"[{method_name}] Rate limit - {wait_time}초 대기 후 재시도")
            time.sleep(wait_time)
            last_exception = e
        
        except ExternalAPIException as e:
            if e.status_code and e.status_code >= 500:  # 서버 오류만 재시도
                retry_count += 1
                wait_time = 5 * (2 ** (retry_count - 1))
                log_warning(f"[{method_name}] 서버 오류 - 재시도 {retry_count}/{max_retries}")
                time.sleep(wait_time)
                last_exception = e
            else:
                raise
        
        except (ValidationException, AuthenticationException):
            # 재시도 불가능한 예외는 즉시 발생
            raise
    
    # 모든 재시도 실패
    if last_exception:
        raise last_exception
```

---

## 7. 사용 예시

```python
# 메인 실행
if __name__ == "__main__":
    workflow_id = str(uuid.uuid4())
    
    try:
        # 자동 재시도 포함
        result = execute_with_retry(
            func=execute_update_workflow,
            max_retries=3,
            method_name="update_workflow"
        )
        
        # 결과 분석
        print(json.dumps(result, indent=2, ensure_ascii=False))
        
        # 실패한 메서드만 재점검
        for step_name, step_result in result["steps"].items():
            if not step_result.get("success"):
                print(f"❌ 재점검 필요: {step_name}")
                print(f"   오류: {step_result.get('error')}")
    
    except AgentException as e:
        log_error(workflow_id, e)
        print(f"작업 실패 - 수정 대상: {e.method}")
        print(f"오류 코드: {e.code}")
        print(f"상세: {e.message}")
```

---

## 8. 체크리스트

메서드 단위 예외 처리 설계 시 확인사항:

- [ ] 각 메서드마다 명확한 입력 검증 단계 있음
- [ ] 외부 API/DB 호출마다 개별 예외 처리
- [ ] 예외 발생 시 메서드명이 명확하게 기록됨
- [ ] 재시도 가능 여부가 예외에 포함됨
- [ ] 부분 성공 처리 (한 메서드 실패 시 다른 메서드는 계속 실행)
- [ ] 로그에 workflow_id로 전체 흐름 추적 가능
- [ ] 실패한 메서드만 수정 가능한 구조
- [ ] 자동 재시도 로직 포함
